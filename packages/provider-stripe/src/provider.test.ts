import { expect, it, vi } from 'vitest'
import { createStripeProvider, type StripePaymentIntent } from './provider'
import { createStripeSdkAdapter } from './sdk'

const dto: StripePaymentIntent = { id: 'pi_1', amount: 1999, currency: 'usd', status: 'succeeded' }
const opts = { idempotencyKey: 'attempt' }
const token = { kind: 'token' as const, token: 'pm_1' }
const setup = (response: StripePaymentIntent = dto) => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async () => Response.json(response))
  const provider = createStripeProvider({
    config: { baseUrl: 'https://shop.test/stripe/', credentials: 'include' },
    fetch,
    uuid: () => 'uuid',
    now: Date.now,
    log: { debug() {}, warn() {}, error() {} },
  })
  return { provider, fetch }
}

it.each([
  ['succeeded', 'succeeded'],
  ['processing', 'processing'],
  ['requires_capture', 'error'],
  ['canceled', 'error'],
  ['requires_confirmation', 'error'],
  ['requires_payment_method', 'error'],
] as const)('maps Stripe %s to %s', async (status, expected) => {
  const { provider } = setup({ ...dto, status })
  const result = await provider.confirm('pi_1', token, opts)
  expect(result.status).toBe(expected)
  if (status === 'requires_capture')
    expect(result).toMatchObject({
      intent: { status: 'processing' },
      error: { code: 'capture_required' },
    })
})
it('uses distinct idempotency keys for create, confirm and cancel', async () => {
  const { provider, fetch } = setup()
  await provider.createIntent({ planId: 'starter', amount: 1 }, opts)
  await provider.confirm('pi_1', token, opts)
  await provider.cancel?.('pi_1', opts)
  const keys = fetch.mock.calls.map(([, init]) => new Headers(init?.headers).get('Idempotency-Key'))
  expect(new Set(keys).size).toBe(3)
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ planId: 'starter' })
  expect(fetch.mock.calls[0][1]?.credentials).toBe('include')
})
it('requires tokenized payment details and does not send raw cards', async () => {
  const { provider, fetch } = setup()
  await expect(provider.confirm('pi_1', { kind: 'none' }, opts)).resolves.toMatchObject({
    error: { code: 'unsupported_instrument' },
  })
  expect(fetch).not.toHaveBeenCalled()
})
it('hands use_stripe_sdk to the registered adapter without persisting a secret in the intent', async () => {
  const { provider } = setup({
    ...dto,
    status: 'requires_action',
    client_secret: 'pi_1_secret_test',
    next_action: { type: 'use_stripe_sdk' },
  })
  const result = await provider.confirm('pi_1', token, opts)
  expect(result).toMatchObject({
    status: 'requires_action',
    action: { kind: 'sdk_handoff', sdk: 'stripe', params: { clientSecret: 'pi_1_secret_test' } },
  })
  expect(JSON.stringify(result.intent)).not.toContain('secret')
})
it('preserves Stripe redirect URLs instead of changing their signed parameters', async () => {
  const url = 'https://bank.test/approve?signed=data&return_url=https%3A%2F%2Fshop.test%2Freturn'
  const { provider } = setup({
    ...dto,
    status: 'requires_action',
    next_action: { type: 'redirect_to_url', redirect_to_url: { url } },
  })
  await expect(provider.confirm('pi_1', token, opts)).resolves.toMatchObject({ action: { url } })
})
it('reads the server when confirmation loses its response', async () => {
  const { provider, fetch } = setup()
  fetch.mockRejectedValueOnce(new Error('offline'))
  await expect(provider.confirm('pi_1', token, opts)).resolves.toMatchObject({
    status: 'succeeded',
  })
  expect(fetch).toHaveBeenCalledTimes(2)
})
it('keeps the issuer decline code and exposes a declined intent when reread', async () => {
  const { provider } = setup({
    ...dto,
    status: 'requires_payment_method',
    last_payment_error: { decline_code: 'insufficient_funds', message: 'Insufficient funds.' },
  })
  await expect(provider.confirm('pi_1', token, opts)).resolves.toMatchObject({
    status: 'declined',
    error: { code: 'insufficient_funds' },
  })
  await expect(provider.getIntent('pi_1', opts)).resolves.toMatchObject({ status: 'declined' })
})
it('never trusts a success flag in the return URL or SDK callback', async () => {
  const { provider } = setup({
    ...dto,
    status: 'requires_payment_method',
    last_payment_error: { message: 'Declined' },
  })
  await expect(
    provider.resume(
      'pi_1',
      { via: 'return_url', actionId: 'pi_1', params: { status: 'succeeded' } },
      opts,
    ),
  ).resolves.toMatchObject({ status: 'declined' })
})
it('runs Stripe.js through an injected official client', async () => {
  const handleNextAction = vi.fn().mockResolvedValue({ paymentIntent: { status: 'succeeded' } })
  const adapter = createStripeSdkAdapter(() => ({ handleNextAction }))
  await adapter.request({ clientSecret: 'pi_1_secret_test' }, new AbortController().signal)
  expect(handleNextAction).toHaveBeenCalledWith({ clientSecret: 'pi_1_secret_test' })
})
it('does not call Stripe.js if checkout was already canceled', async () => {
  const handleNextAction = vi.fn()
  const controller = new AbortController()
  controller.abort()
  await expect(
    createStripeSdkAdapter(() => ({ handleNextAction })).request(
      { clientSecret: 'secret' },
      controller.signal,
    ),
  ).rejects.toThrow(/canceled/)
  expect(handleNextAction).not.toHaveBeenCalled()
})
