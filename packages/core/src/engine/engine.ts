// The payment loop: create an intent, confirm it, run whatever the provider asks for next,
// and repeat until the payment is settled.
//
// `pay` stops when a provider asks for an action instead of running it, so the host can
// navigate or mount a frame first and then call `runPendingAction`.

import type { ActionSurface, PaymentAction } from '../domain/action'
import type { ActionEvidence } from '../domain/evidence'
import type { PaymentInstrument } from '../domain/instrument'
import type {
  CreateIntentInput,
  PaymentError,
  PaymentIntent,
  PaymentStatus,
} from '../domain/intent'
import type { PaymentResult } from '../domain/result'
import type { ProviderCapabilities } from '../provider/capabilities'
import type { CallOptions, PaymentProviderInstance } from '../provider/provider'
import { anySignal } from '../support/abort'
import { silentLogger, type Logger } from '../support/logger'
import type { EngineEvent, EngineEventOf, EngineEventType } from './events'
import { isBusyPhase, nextPhase, type CheckoutPhase } from './machine'
import {
  clearPendingCheckout,
  memoryStorage,
  readPendingCheckout,
  writePendingCheckout,
  type StorageAdapter,
} from './persistence'
import {
  createProviderRegistry,
  type ProviderRegistration,
  type ProviderRegistry,
} from './registry'
import type { MountHandle, RunnerRegistry } from './runner'
import { createStore } from './store'

export interface CheckoutSnapshot {
  readonly phase: CheckoutPhase
  readonly providerId: string | null
  /**
   * What the current provider can do, once it has loaded. `null` until then.
   *
   * For rendering and validation only - whether to ask for a card at all. What a payment
   * needs is decided by the action the provider returns.
   */
  readonly capabilities: ProviderCapabilities | null
  readonly intent: PaymentIntent | null
  /** The action waiting to be run, or the one currently running. */
  readonly action: PaymentAction | null
  readonly error: PaymentError | null
  /** How many actions this payment has already been through. */
  readonly attempt: number
}

export interface PayRequest {
  readonly input: CreateIntentInput
  readonly instrument: PaymentInstrument
  /** Reuse a key to make a retry of the *same* attempt safe. Generated when omitted. */
  readonly idempotencyKey?: string
}

export interface RunActionOptions {
  /** Where a visible action may render. Required by surfaces that show something. */
  readonly mount?: MountHandle | null
  /** Override the provider's preferred surface, e.g. escalate an iframe to a redirect. */
  readonly surface?: ActionSurface
}

export interface CheckoutEngine {
  getSnapshot(): CheckoutSnapshot
  subscribe(listener: () => void): () => void
  on<T extends EngineEventType>(type: T, handler: (event: EngineEventOf<T>) => void): () => void

  readonly providerIds: readonly string[]
  useProvider(providerId: string): Promise<void>

  /** Create the intent ahead of submission. A no-op for providers that do not need it. */
  prepare(input: CreateIntentInput): Promise<void>
  pay(request: PayRequest): Promise<PaymentResult>
  /** Execute the pending action and hand its evidence to the provider. */
  runPendingAction(options?: RunActionOptions): Promise<PaymentResult>
  /** Continue with evidence the host obtained itself (e.g. from a return URL). */
  resumeWith(evidence: ActionEvidence): Promise<PaymentResult>
  /** Pick up a payment left in flight by a full-page redirect. */
  hydrate(params?: Readonly<Record<string, string>>): Promise<PaymentResult | null>
  fetchIntent(intentId: string, providerId?: string): Promise<PaymentIntent>
  abort(reason?: 'user' | 'timeout'): Promise<PaymentResult>
  reset(): void
}

export interface CheckoutEngineConfig {
  readonly providers: readonly ProviderRegistration[]
  readonly runners: RunnerRegistry
  /** Absolute URL a provider should send the browser back to. Only the host knows it. */
  readonly returnUrl: string
  readonly defaultProviderId?: string
  readonly storage?: StorageAdapter
  readonly fetch?: typeof fetch
  readonly uuid?: () => string
  readonly now?: () => number
  readonly sleep?: (ms: number) => Promise<void>
  readonly log?: Logger
  /** Ceiling on chained actions, so a misbehaving provider cannot loop forever. */
  readonly maxActions?: number
  readonly actionTimeoutMs?: number
  readonly poll?: { readonly intervalMs: number; readonly timeoutMs: number }
}

const INITIAL: CheckoutSnapshot = {
  phase: 'idle',
  providerId: null,
  capabilities: null,
  intent: null,
  action: null,
  error: null,
  attempt: 0,
}

const toPaymentError = (cause: unknown): PaymentError => ({
  code: 'engine_error',
  message: cause instanceof Error ? cause.message : 'The payment could not be completed.',
})

const inputKey = (input: CreateIntentInput): string =>
  JSON.stringify([
    input.planId,
    input.amount,
    input.currency,
    Object.entries(input.metadata ?? {}).sort(([a], [b]) => a.localeCompare(b)),
  ])

const stoppedResult = (): PaymentResult => ({
  status: 'error',
  error: { code: 'canceled', message: 'This payment attempt is no longer active.' },
})

const busyResult = (): PaymentResult => ({
  status: 'error',
  error: { code: 'busy', message: 'A payment operation is already running.' },
})

export const createCheckout = (config: CheckoutEngineConfig): CheckoutEngine => {
  const log = config.log ?? silentLogger
  const storage = config.storage ?? memoryStorage()
  const uuid = config.uuid ?? (() => crypto.randomUUID())
  const now = config.now ?? (() => Date.now())
  const sleep =
    config.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const maxActions = config.maxActions ?? 4
  const actionTimeoutMs = config.actionTimeoutMs ?? 10 * 60 * 1000
  const poll = config.poll ?? { intervalMs: 1500, timeoutMs: 60_000 }

  const store = createStore(INITIAL, log)
  const listeners = new Map<EngineEventType, Set<(event: EngineEvent) => void>>()

  const emit = (event: EngineEvent): void => {
    for (const handler of [...(listeners.get(event.type) ?? [])]) {
      try {
        handler(event)
      } catch (cause) {
        log.error('checkout event handler threw', { cause, event: event.type })
      }
    }
  }

  const registry: ProviderRegistry = createProviderRegistry({
    registrations: config.providers,
    createContext: (providerConfig) => ({
      config: providerConfig,
      fetch: config.fetch ?? globalThis.fetch,
      uuid,
      now,
      log,
    }),
    // A provider that can ask for something this host cannot execute is a boot-time bug.
    onLoaded: (provider) => config.runners.assertCovers(provider.id, provider.capabilities),
  })

  // Payment state that is not worth re-rendering over.
  let idempotencyKey: string | null = null
  let abortController: AbortController | null = null
  let version = 0
  let selection = 0
  let preparedInput: string | null = null
  let actionRun = 0
  let runningSurface: ActionSurface | null = null
  let stopAction: AbortController | null = null

  const current = (started: number): boolean =>
    started === version && !abortController?.signal.aborted

  const begin = (): number => {
    abortController?.abort('superseded')
    abortController = new AbortController()
    selection++
    return ++version
  }

  const transition = (event: Parameters<typeof nextPhase>[1]): boolean => {
    const previous = store.getSnapshot().phase
    const phase = nextPhase(previous, event)
    if (!phase) {
      log.warn('ignored an out-of-order checkout transition', { previous, event })
      return false
    }
    store.set({ phase })
    if (phase !== previous) emit({ type: 'phase_changed', phase, previous })
    return true
  }

  const providerIdOrThrow = (): string => {
    const { providerId } = store.getSnapshot()
    if (providerId) return providerId
    throw new Error('No payment provider selected. Pass `defaultProviderId` or call useProvider().')
  }

  const instanceOf = async (providerId: string): Promise<PaymentProviderInstance> => {
    const loaded = await registry.load(providerId)
    // Publishing capabilities on load rather than on demand keeps them in the snapshot,
    // so a form that renders differently per provider re-renders when one arrives.
    if (store.getSnapshot().providerId === providerId) {
      store.set({ capabilities: loaded.provider.capabilities })
    }
    return loaded.instance
  }

  const callOptions = (): CallOptions => ({
    idempotencyKey: idempotencyKey ?? uuid(),
    signal: abortController?.signal,
  })

  /**
   * Plugins must not throw, but a plugin is third-party code - so the engine catches
   * anyway and the UI never has to.
   */
  const safely = async (
    operation: () => Promise<PaymentResult>,
    context: string,
  ): Promise<PaymentResult> => {
    try {
      return await operation()
    } catch (cause) {
      log.error(`provider threw during ${context}`, { cause })
      return { status: 'error', error: toPaymentError(cause) }
    }
  }

  const persistPending = (action: PaymentAction): void => {
    const { providerId, intent } = store.getSnapshot()
    if (!providerId || !intent) return
    // Written *before* the action runs: a top-level redirect ends this page immediately.
    writePendingCheckout(storage, {
      providerId,
      intentId: intent.id,
      actionId: action.id,
      idempotencyKey: idempotencyKey ?? '',
      startedAt: now(),
    })
  }

  const applyResult = async (result: PaymentResult, started = version): Promise<PaymentResult> => {
    if (!current(started)) return stoppedResult()
    emit({ type: 'result', result })
    if (!current(started)) return stoppedResult()

    switch (result.status) {
      case 'requires_action': {
        if (store.getSnapshot().attempt >= maxActions) {
          return applyResult(
            {
              status: 'error',
              intent: result.intent,
              error: {
                code: 'too_many_actions',
                message: 'The payment asked for too many authentication steps.',
              },
            },
            started,
          )
        }
        transition('action_required')
        if (!current(started)) return stoppedResult()
        store.set({ intent: result.intent, action: result.action, error: null })
        emit({ type: 'action_required', action: result.action })
        return result
      }

      case 'processing': {
        transition('processing')
        if (!current(started)) return stoppedResult()
        store.set({ intent: result.intent, action: null, error: null })
        return await pollUntilSettled(result, started)
      }

      case 'succeeded': {
        transition('succeeded')
        if (!current(started)) return stoppedResult()
        store.set({ intent: result.intent, action: null, error: null })
        clearPendingCheckout(storage)
        return result
      }

      case 'declined': {
        transition('declined')
        if (!current(started)) return stoppedResult()
        store.set({ intent: result.intent, action: null, error: result.error })
        clearPendingCheckout(storage)
        return result
      }

      case 'error': {
        transition('failed')
        if (!current(started)) return stoppedResult()
        store.set({
          intent: result.intent ?? store.getSnapshot().intent,
          action: null,
          error: result.error,
        })
        clearPendingCheckout(storage)
        emit({ type: 'error', error: result.error })
        return result
      }
    }
  }

  const TERMINAL: readonly PaymentStatus[] = ['succeeded', 'declined', 'canceled']

  /** Asks the provider until the payment settles, the deadline passes, or we are told to stop. */
  const pollForEvidence = async (
    action: PaymentAction & { completion: { via: 'poll'; intervalMs: number; timeoutMs: number } },
    intentId: string,
    signal: AbortSignal,
  ): Promise<ActionEvidence> => {
    const instance = await instanceOf(providerIdOrThrow())
    const deadline = now() + action.completion.timeoutMs

    while (now() < deadline && !signal.aborted) {
      await sleep(action.completion.intervalMs)
      if (signal.aborted) break

      // A hiccup mid-poll is not an answer: keep asking until the deadline says otherwise.
      const intent = await instance
        .getIntent(intentId, {
          ...callOptions(),
          signal: anySignal([signal, ...(abortController ? [abortController.signal] : [])]),
        })
        .catch(() => null)
      if (signal.aborted) break
      if (intent && TERMINAL.includes(intent.status)) {
        return { via: 'poll', actionId: action.id }
      }
    }

    return { via: 'aborted', actionId: action.id, reason: signal.aborted ? 'user' : 'timeout' }
  }

  /** Whichever finishes first wins, and stops the other. */
  const raceWithPolling = async (
    action: PaymentAction,
    intentId: string,
    fromRunner: Promise<ActionEvidence>,
    stopRunner: AbortController,
  ): Promise<ActionEvidence> => {
    if (action.completion.via !== 'poll') return await fromRunner
    const stopPolling = new AbortController()

    return await Promise.race([
      fromRunner.finally(() => stopPolling.abort()),
      pollForEvidence(
        { ...action, completion: action.completion },
        intentId,
        stopPolling.signal,
      ).finally(() => stopRunner.abort()),
    ])
  }

  /**
   * `processing` means accepted but not settled. The only way to learn the outcome is to
   * keep asking the provider.
   */
  const pollUntilSettled = async (
    initial: PaymentResult & { status: 'processing' },
    started: number,
  ): Promise<PaymentResult> => {
    const providerId = providerIdOrThrow()
    const loaded = await registry.load(providerId)
    if (!current(started)) return stoppedResult()
    const opts = callOptions()
    if (!loaded.provider.capabilities.poll) {
      return await applyResult(
        {
          status: 'error',
          intent: initial.intent,
          error: {
            code: 'processing_not_settled',
            message: 'The payment is still processing. You will be notified once it completes.',
          },
        },
        started,
      )
    }

    const deadline = now() + poll.timeoutMs
    while (now() < deadline && current(started)) {
      await sleep(poll.intervalMs)
      if (!current(started)) return stoppedResult()
      const intent = await loaded.instance.getIntent(initial.intent.id, opts).catch(() => null)
      if (!current(started)) return stoppedResult()
      if (!intent) continue
      if (intent.status === 'succeeded')
        return await applyResult({ status: 'succeeded', intent }, started)
      if (intent.status === 'declined') {
        return await applyResult(
          {
            status: 'declined',
            intent,
            error: { code: 'declined', message: 'The payment was declined.' },
          },
          started,
        )
      }
      if (intent.status === 'canceled') {
        return await applyResult(
          {
            status: 'error',
            intent,
            error: { code: 'canceled', message: 'The payment was canceled.' },
          },
          started,
        )
      }
    }

    return await applyResult(
      {
        status: 'error',
        intent: initial.intent,
        error: {
          code: 'processing_timeout',
          message: 'The payment is taking longer than expected. Check back shortly.',
        },
      },
      started,
    )
  }

  const resumeEvidence = async (
    evidence: ActionEvidence,
    started: number,
  ): Promise<PaymentResult> => {
    if (!current(started)) return stoppedResult()
    const providerId = providerIdOrThrow()
    const intent = store.getSnapshot().intent
    if (!intent) return stoppedResult()
    if (evidence.via === 'aborted' && evidence.reason === 'user') return engine.abort('user')
    const opts = callOptions()
    const result = await safely(async () => {
      const instance = await instanceOf(providerId)
      if (!current(started)) return stoppedResult()
      const result = await instance.resume(intent.id, evidence, opts)
      if (!current(started)) return stoppedResult()
      if (result.status === 'error') {
        const authoritative = await instance.getIntent(intent.id, opts).catch(() => null)
        if (authoritative?.status === 'succeeded')
          return { status: 'succeeded', intent: authoritative }
      }
      return result
    }, 'resume')
    return applyResult(result, started)
  }

  const engine: CheckoutEngine = {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,

    on: (type, handler) => {
      const set = listeners.get(type) ?? new Set()
      set.add(handler as (event: EngineEvent) => void)
      listeners.set(type, set)
      return () => {
        set.delete(handler as (event: EngineEvent) => void)
      }
    },

    providerIds: registry.ids,

    useProvider: async (providerId) => {
      if (!registry.has(providerId)) {
        throw new Error(`Unknown payment provider "${providerId}".`)
      }
      const inFlight = (): boolean =>
        isBusyPhase(store.getSnapshot().phase) || store.getSnapshot().phase === 'action_pending'
      if (inFlight()) {
        throw new Error('Cannot switch provider while a payment is in flight.')
      }
      const selected = ++selection
      const loaded = await registry.load(providerId)
      if (selected !== selection) return
      if (inFlight()) throw new Error('Cannot switch provider while a payment is in flight.')
      if (store.getSnapshot().providerId !== providerId) engine.reset()
      store.set({ providerId, capabilities: loaded.provider.capabilities })
      emit({ type: 'provider_changed', providerId })
    },

    prepare: async (input) => {
      const providerId = providerIdOrThrow()
      const beforeLoad = version
      const loaded = await registry.load(providerId)
      if (beforeLoad !== version || store.getSnapshot().providerId !== providerId) return
      if (loaded.provider.capabilities.session !== 'eager') return

      if (!nextPhase(store.getSnapshot().phase, 'prepare')) return
      const started = begin()
      idempotencyKey = uuid()
      preparedInput = inputKey(input)
      store.set({ intent: null, error: null })
      transition('prepare')
      if (!current(started)) return
      const opts = callOptions()
      try {
        const intent = await loaded.instance.createIntent(input, opts)
        if (!current(started)) return
        store.set({ intent })
        emit({ type: 'intent_created', intent })
        transition('prepared')
      } catch (cause) {
        await applyResult({ status: 'error', error: toPaymentError(cause) }, started)
      }
    },

    pay: async (request) => {
      const { providerId, phase, intent: previousIntent } = store.getSnapshot()
      if (!providerId) {
        return {
          status: 'error',
          error: { code: 'no_provider', message: 'Select a payment provider first.' },
        }
      }
      if (!nextPhase(phase, 'pay')) return busyResult()
      // A timeout is not evidence of failure. Reconcile an accepted payment instead of
      // creating a second charge when the shopper presses Pay again.
      if (previousIntent?.status === 'processing') {
        const started = begin()
        return applyResult({ status: 'processing', intent: previousIntent }, started)
      }
      const existing =
        (phase === 'ready' || phase === 'failed') &&
        preparedInput === inputKey(request.input) &&
        (!request.idempotencyKey || request.idempotencyKey === idempotencyKey)
          ? previousIntent
          : null

      const started = begin()
      idempotencyKey = request.idempotencyKey ?? (existing ? idempotencyKey : null) ?? uuid()
      preparedInput = inputKey(request.input)
      store.set({ intent: existing, error: null, action: null, attempt: 0 })
      transition('pay')
      const opts = callOptions()

      return await applyResult(
        await safely(async () => {
          const instance = await instanceOf(providerId)
          if (!current(started)) return stoppedResult()
          const intent = existing ?? (await instance.createIntent(request.input, opts))
          if (!current(started)) return stoppedResult()
          if (!existing) {
            store.set({ intent })
            emit({ type: 'intent_created', intent })
          }
          if (store.getSnapshot().phase === 'creating') transition('created')

          if (!current(started)) return stoppedResult()
          return await instance.confirm(intent.id, request.instrument, opts)
        }, 'confirm'),
        started,
      )
    },

    runPendingAction: async (options = {}) => {
      const { action, intent, phase } = store.getSnapshot()
      const started = version
      if (phase !== 'action_pending' && phase !== 'action_running') return busyResult()

      if (!action || !intent) {
        return await applyResult({
          status: 'error',
          error: { code: 'no_pending_action', message: 'There is nothing to authenticate.' },
        })
      }

      const surface = options.surface ?? action.surface
      if (phase === 'action_running' && surface === runningSurface) return busyResult()
      const runner = config.runners.resolve(action, surface)
      if (!runner) {
        return await applyResult({
          status: 'error',
          intent,
          error: {
            code: 'unsupported_action',
            message: `This page cannot run a ${action.kind} action on the ${surface} surface.`,
          },
        })
      }

      if (!transition('run_action')) {
        return busyResult()
      }
      stopAction?.abort('surface_changed')
      const run = ++actionRun
      runningSurface = surface
      persistPending(action)
      if (phase === 'action_pending') store.set({ attempt: store.getSnapshot().attempt + 1 })
      emit({ type: 'action_started', action, surface })

      abortController ??= new AbortController()
      // Cuts the runner short when the payment finishes somewhere else - see below.
      const stopRunner = new AbortController()
      stopAction = stopRunner
      const signal = anySignal([abortController.signal, stopRunner.signal])

      const fromRunner = Promise.resolve()
        .then(() =>
          runner.run(action, {
            surface,
            signal,
            returnUrl: config.returnUrl,
            mount: options.mount ?? null,
            deadline: now() + actionTimeoutMs,
            report: (progress) =>
              log.debug('action progress', { ...progress, actionId: action.id }),
          }),
        )
        .catch((cause: unknown): ActionEvidence => ({
          via: 'aborted',
          actionId: action.id,
          reason: 'runner_error',
          cause,
        }))

      // A QR code or a payment slip is finished by money arriving, which nothing on this
      // page can observe. So the provider is asked, over and over, in parallel with the
      // runner - and the shopper can still walk away, which is the other half of the race.
      const evidence =
        action.completion.via === 'poll'
          ? await raceWithPolling(action, intent.id, fromRunner, stopRunner)
          : await fromRunner

      if (!current(started) || run !== actionRun) return stoppedResult()
      runningSurface = null
      emit({ type: 'action_finished', action, evidence })

      // Cancelled while the action was running: the runner still reports back, and that
      // late report must not restart the payment.
      if (store.getSnapshot().phase === 'canceled') {
        return {
          status: 'error',
          intent,
          error: { code: 'canceled', message: 'The payment was canceled.' },
        }
      }

      transition('action_done')
      return await resumeEvidence(evidence, started)
    },

    resumeWith: async (evidence) => {
      const { action, intent, phase } = store.getSnapshot()
      if (phase !== 'action_pending' || !action || !intent) return busyResult()
      if (evidence.actionId !== action.id) {
        return {
          status: 'error',
          error: { code: 'invalid_evidence', message: 'The evidence belongs to another action.' },
        }
      }
      const started = version
      transition('resume')
      return resumeEvidence(evidence, started)
    },

    hydrate: async (params = {}) => {
      const pending = readPendingCheckout(storage)
      if (!pending) return null

      if (!registry.has(pending.providerId)) {
        log.warn('a payment was left in flight for a provider this page does not register', {
          providerId: pending.providerId,
        })
        return null
      }

      if (!transition('hydrate')) return null
      const started = begin()
      idempotencyKey = pending.idempotencyKey || uuid()
      store.set({ providerId: pending.providerId })
      const opts = callOptions()

      const result = await applyResult(
        await safely(async () => {
          const instance = await instanceOf(pending.providerId)
          if (!current(started)) return stoppedResult()
          const intent = await instance.getIntent(pending.intentId, opts)
          if (!current(started)) return stoppedResult()
          store.set({ intent })
          if (intent.status === 'succeeded') return { status: 'succeeded', intent }
          if (intent.status === 'declined')
            return {
              status: 'declined',
              intent,
              error: { code: 'declined', message: 'The payment was declined.' },
            }
          if (intent.status === 'canceled')
            return {
              status: 'error',
              intent,
              error: { code: 'canceled', message: 'The payment was canceled.' },
            }

          return await instance.resume(
            pending.intentId,
            { via: 'return_url', actionId: pending.actionId, params },
            opts,
          )
        }, 'hydrate'),
        started,
      )
      // A temporary outage must not erase the only handle for a redirected payment.
      if (current(started) && result.status === 'error' && result.intent?.status !== 'canceled') {
        writePendingCheckout(storage, pending)
      }
      return result
    },

    fetchIntent: async (intentId, providerId) => {
      const instance = await instanceOf(providerId ?? providerIdOrThrow())
      return await instance.getIntent(intentId, callOptions())
    },

    abort: async (reason = 'user') => {
      const { intent, phase, providerId } = store.getSnapshot()

      const canceled: PaymentResult = {
        status: 'error',
        intent: intent ?? undefined,
        error: { code: 'canceled', message: 'The payment was canceled.' },
      }

      // Aborting an already-aborted payment must not cancel the intent twice: the runner
      // that was interrupted reports back with `aborted` evidence, which lands here again.
      if (phase === 'canceled') return canceled
      if (phase === 'succeeded' && intent) return { status: 'succeeded', intent }
      if (phase === 'declined' && intent)
        return {
          status: 'declined',
          intent,
          error: store.getSnapshot().error ?? { message: 'The payment was declined.' },
        }
      if (phase === 'idle') return canceled

      const canceledVersion = ++version
      selection++
      abortController?.abort(reason)
      stopAction?.abort(reason)

      // Move the phase first, synchronously: the interrupted runner re-enters here in the
      // same tick, and without it we would send a second cancellation.
      clearPendingCheckout(storage)
      transition('canceled')
      store.set({ action: null })

      if (intent && providerId) {
        const loaded = registry.peek(providerId)
        if (loaded?.provider.capabilities.cancel && loaded.instance.cancel) {
          // No abort signal here: it was just fired to stop the runner, and reusing it
          // would kill this request before it left. Best effort - the shopper has gone.
          const authoritative = await loaded.instance
            .cancel(intent.id, { idempotencyKey: idempotencyKey ?? uuid() })
            .catch((cause: unknown) => {
              log.warn('could not cancel the intent after an abort', { cause })
            })
          if (version === canceledVersion && authoritative) {
            store.set({ intent: authoritative })
            if (authoritative.status === 'succeeded') {
              const started = begin()
              return applyResult({ status: 'succeeded', intent: authoritative }, started)
            }
          }
        }
      }

      return canceled
    },

    reset: () => {
      version++
      selection++
      abortController?.abort('reset')
      stopAction?.abort('reset')
      abortController = null
      idempotencyKey = null
      preparedInput = null
      runningSurface = null
      clearPendingCheckout(storage)
      transition('reset')
      const { providerId, capabilities } = store.getSnapshot()
      store.set({ ...INITIAL, providerId, capabilities })
    },
  }

  if (config.defaultProviderId) {
    if (!registry.has(config.defaultProviderId))
      throw new Error(`Unknown default payment provider "${config.defaultProviderId}".`)
    store.set({ providerId: config.defaultProviderId })
  }
  for (const registration of config.providers) {
    if (!registration.eager) continue
    // Nothing is waiting on this, so a failed import would otherwise vanish into an
    // unhandled rejection and only resurface as a confusing error at the till.
    void registry
      .load(registration.id)
      .then((loaded) => {
        if (store.getSnapshot().providerId === registration.id) {
          store.set({ capabilities: loaded.provider.capabilities })
        }
      })
      .catch((cause: unknown) => {
        log.error('could not load a payment provider', { providerId: registration.id, cause })
      })
  }

  return engine
}
