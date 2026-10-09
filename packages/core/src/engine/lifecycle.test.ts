import { describe, expect, it, vi } from 'vitest'
import {
  createFakeProvider,
  createScriptedRunners,
  fakeAction,
  fakeIntent,
} from '@checkout-kit/testing/engine'
import type { PaymentIntent, PaymentProvider, PaymentResult } from '../index'
import { createCheckout } from './engine'
import { memoryStorage, PENDING_CHECKOUT_KEY } from './persistence'

const PAY = { input: { planId: 'starter' }, instrument: { kind: 'none' as const } }
const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const setup = (provider: PaymentProvider<Record<string, never>>, storage = memoryStorage()) =>
  createCheckout({
    providers: [{ id: provider.id, config: {}, load: () => provider }],
    defaultProviderId: provider.id,
    runners: createScriptedRunners(),
    returnUrl: 'https://shop.test/return',
    storage,
  })

it.each(['abort', 'reset'] as const)(
  'ignores intent creation completing after %s',
  async (operation) => {
    const pending = deferred<PaymentIntent>()
    const { provider, calls } = createFakeProvider({ createIntent: () => pending.promise })
    const engine = setup(provider)
    const payment = engine.pay(PAY)
    await vi.waitFor(() => expect(calls.createIntent).toHaveLength(1))
    await engine[operation]()
    pending.resolve(fakeIntent())
    await expect(payment).resolves.toMatchObject({ status: 'error', error: { code: 'canceled' } })
    expect(calls.confirm).toHaveLength(0)
    expect(engine.getSnapshot().phase).toBe(operation === 'reset' ? 'idle' : 'canceled')
    expect(engine.getSnapshot().intent).toBeNull()
  },
)

it('a late confirmation cannot overwrite a new payment after reset', async () => {
  const pending = deferred<PaymentResult>()
  const fake = createFakeProvider()
  let confirms = 0
  const engine = setup({
    ...fake.provider,
    create: (ctx) => ({
      ...fake.provider.create(ctx),
      confirm: async () =>
        ++confirms === 1
          ? pending.promise
          : { status: 'succeeded', intent: fakeIntent({ id: 'new', status: 'succeeded' }) },
    }),
  })
  const old = engine.pay(PAY)
  await vi.waitFor(() => expect(confirms).toBe(1))
  engine.reset()
  await engine.pay(PAY)
  pending.resolve({ status: 'declined', intent: fakeIntent(), error: { message: 'Declined' } })
  await old
  expect(engine.getSnapshot()).toMatchObject({
    phase: 'succeeded',
    intent: { id: 'new' },
    error: null,
  })
})

it('cancels preparation without accepting its late result', async () => {
  const pending = deferred<PaymentIntent>()
  const { provider, calls } = createFakeProvider({
    capabilities: { session: 'eager' },
    createIntent: () => pending.promise,
  })
  const engine = setup(provider)
  const preparation = engine.prepare(PAY.input)
  await vi.waitFor(() => expect(calls.createIntent).toHaveLength(1))
  await engine.abort()
  pending.resolve(fakeIntent())
  await preparation
  expect(engine.getSnapshot()).toMatchObject({ phase: 'canceled', intent: null })
})

it('uses a prepared intent only for the same order', async () => {
  const { provider, calls } = createFakeProvider({ capabilities: { session: 'eager' } })
  const engine = setup(provider)
  await engine.prepare(PAY.input)
  await engine.pay({ ...PAY, input: { planId: 'team' } })
  expect(calls.createIntent.map(({ input }) => input.planId)).toEqual(['starter', 'team'])
  expect(calls.createIntent[0].opts.idempotencyKey).not.toBe(
    calls.createIntent[1].opts.idempotencyKey,
  )
})

it('reuses a matching prepared intent and its idempotency key', async () => {
  const { provider, calls } = createFakeProvider({ capabilities: { session: 'eager' } })
  const engine = setup(provider)
  await engine.prepare(PAY.input)
  await engine.pay(PAY)
  expect(calls.createIntent).toHaveLength(1)
  expect(calls.confirm[0].opts.idempotencyKey).toBe(calls.createIntent[0].opts.idempotencyKey)
})

it('clears the previous provider intent on switching', async () => {
  const first = createFakeProvider({ capabilities: { session: 'eager' } })
  const second = createFakeProvider()
  const engine = createCheckout({
    providers: [
      { id: 'fake', config: {}, load: () => first.provider },
      { id: 'other', config: {}, load: () => ({ ...second.provider, id: 'other' }) },
    ],
    defaultProviderId: 'fake',
    runners: createScriptedRunners(),
    returnUrl: 'https://shop.test/return',
  })
  await engine.prepare(PAY.input)
  await engine.useProvider('other')
  expect(engine.getSnapshot().intent).toBeNull()
  await engine.pay(PAY)
  expect(second.calls.createIntent).toHaveLength(1)
})

it('does not switch providers while an action is waiting for the shopper', async () => {
  const { provider } = createFakeProvider({
    confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
  })
  const engine = setup(provider)
  await engine.pay(PAY)
  await expect(engine.useProvider('fake')).rejects.toThrow(/in flight/)
})

it('starts a fresh attempt after decline, including when the order changes', async () => {
  const { provider, calls } = createFakeProvider({
    confirm: [
      {
        status: 'declined',
        intent: fakeIntent({ status: 'declined' }),
        error: { message: 'Declined' },
      },
    ],
  })
  const engine = setup(provider)
  await engine.pay(PAY)
  await engine.pay({ ...PAY, input: { planId: 'team' } })
  expect(calls.createIntent).toHaveLength(2)
  expect(calls.createIntent[0].opts.idempotencyKey).not.toBe(
    calls.createIntent[1].opts.idempotencyKey,
  )
})

it('does not run an action twice concurrently', async () => {
  const pending = deferred<import('../domain/evidence').ActionEvidence>()
  const fake = createFakeProvider({
    capabilities: { actions: ['redirect'], surfaces: ['iframe'] },
    confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
  })
  let runs = 0
  const runners = createScriptedRunners({
    evidence: async () => {
      runs++
      return pending.promise
    },
  })
  const engine = createCheckout({
    providers: [{ id: 'fake', config: {}, load: () => fake.provider }],
    defaultProviderId: 'fake',
    runners,
    returnUrl: 'https://shop.test/return',
  })
  await engine.pay(PAY)
  const first = engine.runPendingAction()
  await expect(engine.runPendingAction()).resolves.toMatchObject({
    status: 'error',
    error: { code: 'busy' },
  })
  pending.resolve({ via: 'post_message', actionId: 'act_1', origin: 'https://bank.test', data: {} })
  await first
  expect(runs).toBe(1)
  expect(fake.calls.resume).toHaveLength(1)
})

it('rejects evidence for another action without changing the active payment', async () => {
  const { provider, calls } = createFakeProvider({
    confirm: [{ status: 'requires_action', intent: fakeIntent(), action: fakeAction() }],
  })
  const engine = setup(provider)
  await engine.pay(PAY)
  await expect(
    engine.resumeWith({ via: 'return_url', actionId: 'wrong', params: {} }),
  ).resolves.toMatchObject({ status: 'error', error: { code: 'invalid_evidence' } })
  expect(engine.getSnapshot().phase).toBe('action_pending')
  expect(calls.resume).toHaveLength(0)
  await engine.resumeWith({ via: 'return_url', actionId: 'act_1', params: {} })
  await engine.resumeWith({ via: 'return_url', actionId: 'act_1', params: {} })
  expect(calls.resume).toHaveLength(1)
})

it('retains redirect recovery after an outage and retries hydration', async () => {
  const storage = memoryStorage()
  storage.write(
    PENDING_CHECKOUT_KEY,
    JSON.stringify({
      providerId: 'fake',
      intentId: 'pi_fake',
      actionId: 'act_1',
      idempotencyKey: 'key',
      startedAt: 0,
    }),
  )
  let reads = 0
  const { provider, calls } = createFakeProvider({
    getIntent: () => {
      if (++reads === 1) throw new Error('offline')
      return fakeIntent({ status: 'requires_action' })
    },
  })
  const engine = setup(provider, storage)
  await expect(engine.hydrate()).resolves.toMatchObject({ status: 'error' })
  expect(storage.read(PENDING_CHECKOUT_KEY)).not.toBeNull()
  await expect(engine.hydrate()).resolves.toMatchObject({ status: 'succeeded' })
  expect(calls.resume).toHaveLength(1)
  expect(storage.read(PENDING_CHECKOUT_KEY)).toBeNull()
})

it('settles a completed redirected payment without resuming or capturing again', async () => {
  const storage = memoryStorage()
  storage.write(
    PENDING_CHECKOUT_KEY,
    JSON.stringify({
      providerId: 'fake',
      intentId: 'pi_fake',
      actionId: 'act_1',
      idempotencyKey: 'key',
      startedAt: 0,
    }),
  )
  const { provider, calls } = createFakeProvider()
  const engine = setup(provider, storage)
  await expect(engine.hydrate()).resolves.toMatchObject({ status: 'succeeded' })
  expect(calls.resume).toHaveLength(0)
})

it('processing poll failures stay recoverable and do not create another charge', async () => {
  let clock = 0
  let settle = false
  const { provider, calls } = createFakeProvider({
    confirm: [{ status: 'processing', intent: fakeIntent({ status: 'processing' }) }],
    getIntent: () => {
      if (!settle) throw new Error('offline')
      return fakeIntent({ status: 'succeeded' })
    },
  })
  const engine = createCheckout({
    providers: [{ id: 'fake', config: {}, load: () => provider }],
    defaultProviderId: 'fake',
    runners: createScriptedRunners(),
    returnUrl: 'https://shop.test/return',
    now: () => clock,
    sleep: async (ms) => {
      clock += ms
    },
    poll: { intervalMs: 10, timeoutMs: 20 },
  })
  await expect(engine.pay(PAY)).resolves.toMatchObject({
    status: 'error',
    error: { code: 'processing_timeout' },
  })
  settle = true
  await expect(engine.pay(PAY)).resolves.toMatchObject({ status: 'succeeded' })
  expect(calls.createIntent).toHaveLength(1)
  expect(calls.confirm).toHaveLength(1)
})

it('aborting a processing payment stops a late poll from settling it', async () => {
  const pending = deferred<PaymentIntent>()
  const { provider, calls } = createFakeProvider({
    confirm: [{ status: 'processing', intent: fakeIntent({ status: 'processing' }) }],
    getIntent: () => pending.promise,
  })
  const engine = createCheckout({
    providers: [{ id: 'fake', config: {}, load: () => provider }],
    defaultProviderId: 'fake',
    runners: createScriptedRunners(),
    returnUrl: 'https://shop.test/return',
    sleep: async () => {},
  })
  const payment = engine.pay(PAY)
  await vi.waitFor(() => expect(calls.getIntent).toHaveLength(1))
  await engine.abort()
  pending.resolve(fakeIntent({ status: 'succeeded' }))
  await payment
  expect(engine.getSnapshot().phase).toBe('canceled')
  expect(calls.getIntent).toHaveLength(1)
})

describe('configuration errors', () => {
  it('returns a result when no provider has been selected', async () => {
    const engine = createCheckout({
      providers: [],
      runners: createScriptedRunners(),
      returnUrl: 'https://shop.test/return',
    })
    await expect(engine.pay(PAY)).resolves.toMatchObject({
      status: 'error',
      error: { code: 'no_provider' },
    })
  })
  it('rejects an unknown default provider immediately', () => {
    expect(() =>
      createCheckout({
        providers: [],
        defaultProviderId: 'missing',
        runners: createScriptedRunners(),
        returnUrl: 'https://shop.test/return',
      }),
    ).toThrow(/Unknown default/)
  })
})
