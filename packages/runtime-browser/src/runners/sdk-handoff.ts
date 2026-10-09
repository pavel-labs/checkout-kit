// Hands the payment to a third-party script, such as a wallet. Scripts are loaded once per
// URL, and an integrity hash is passed through when the provider publishes one.

import type { ActionEvidence, ActionRunner, PaymentAction, RunnerContext } from '@checkout-kit/core'
import { validatePaymentUrl, type PaymentUrlPolicy } from '../security'

type SdkHandoffAction = Extract<PaymentAction, { kind: 'sdk_handoff' }>

export interface SdkAdapter {
  /** Matches `action.sdk`. */
  readonly sdk: string
  /**
   * Drive the loaded SDK and return whatever the provider expects to charge.
   *
   * Throwing means the shopper dismissed it; the engine reports that as an abandoned
   * payment rather than a failure.
   */
  request(params: Readonly<Record<string, unknown>>, signal: AbortSignal): Promise<unknown>
}

export interface SdkHandoffRunnerOptions {
  readonly security?: PaymentUrlPolicy
  readonly adapters?: readonly SdkAdapter[]
  readonly loadTimeoutMs?: number
}

const loading = new Map<string, { integrity: string | undefined; promise: Promise<void> }>()

const loadScript = (
  url: string,
  integrity: string | undefined,
  timeoutMs: number,
): Promise<void> => {
  const existing = loading.get(url)
  if (existing) {
    if (existing.integrity !== integrity)
      return Promise.reject(
        new Error('The payment SDK was already requested with different integrity settings.'),
      )
    return existing.promise
  }

  const started = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.referrerPolicy = 'no-referrer'
    if (integrity) {
      script.integrity = integrity
      // Required for the browser to check the hash at all on a cross-origin script.
      script.crossOrigin = 'anonymous'
    }

    const timer = setTimeout(() => {
      script.remove()
      reject(new Error('The payment SDK did not load in time.'))
    }, timeoutMs)

    script.addEventListener('load', () => {
      clearTimeout(timer)
      resolve()
    })
    script.addEventListener('error', () => {
      clearTimeout(timer)
      script.remove()
      reject(new Error('The payment SDK could not be loaded.'))
    })

    document.head.append(script)
  })

  // A failed load must not be remembered as done; the next attempt should try again.
  loading.set(url, {
    integrity,
    promise: started.catch((cause: unknown) => {
      loading.delete(url)
      throw cause
    }),
  })
  return loading.get(url)?.promise ?? started
}

export const createSdkHandoffRunner = (
  options: SdkHandoffRunnerOptions = {},
): ActionRunner<'sdk_handoff'> => {
  const adapters = new Map((options.adapters ?? []).map((adapter) => [adapter.sdk, adapter]))

  return {
    kind: 'sdk_handoff',
    surfaces: ['none'],

    run: async (action: SdkHandoffAction, ctx: RunnerContext): Promise<ActionEvidence> => {
      const adapter = adapters.get(action.sdk)
      if (!adapter) {
        return {
          via: 'aborted',
          actionId: action.id,
          reason: 'runner_error',
          cause: new Error(
            `No adapter registered for the "${action.sdk}" SDK. Pass one to createBrowserRuntime.`,
          ),
        }
      }

      const execute = async (): Promise<ActionEvidence> => {
        if (action.scriptUrl) {
          try {
            const url = validatePaymentUrl(
              action.scriptUrl,
              ctx.returnUrl,
              'script',
              options.security,
            )
            ctx.report({ stage: 'loading-sdk', detail: url.origin })
            await loadScript(url.toString(), action.integrity, options.loadTimeoutMs ?? 15_000)
          } catch (cause) {
            return { via: 'aborted', actionId: action.id, reason: 'runner_error', cause }
          }
        }
        if (ctx.signal.aborted) return { via: 'aborted', actionId: action.id, reason: 'user' }
        ctx.report({ stage: 'awaiting-shopper', detail: action.sdk })
        try {
          const payload = await adapter.request(action.params, ctx.signal)
          return { via: 'sdk_callback', actionId: action.id, payload }
        } catch (cause) {
          return { via: 'aborted', actionId: action.id, reason: 'user', cause }
        }
      }

      // Third-party SDKs do not all honor AbortSignal. Bound their wait on our side.
      let timer: ReturnType<typeof setTimeout> | undefined
      let onAbort = (): void => {}
      const stopped = new Promise<ActionEvidence>((resolve) => {
        onAbort = () => resolve({ via: 'aborted', actionId: action.id, reason: 'user' })
        timer = setTimeout(
          () => resolve({ via: 'aborted', actionId: action.id, reason: 'timeout' }),
          Math.max(0, ctx.deadline - Date.now()),
        )
        ctx.signal.addEventListener('abort', onAbort, { once: true })
        if (ctx.signal.aborted) onAbort()
      })
      try {
        if (ctx.signal.aborted) return await stopped
        return await Promise.race([execute(), stopped])
      } finally {
        clearTimeout(timer)
        ctx.signal.removeEventListener('abort', onAbort)
      }
    },
  }
}
