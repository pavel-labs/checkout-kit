import { expect, it, vi } from 'vitest'
import {
  createPayPalProvider,
  payPalProvider,
  type PayPalOrder,
  type PayPalCaptureStatus,
} from './provider'
const base: PayPalOrder = {
  id: 'order_1',
  amount: 1999,
  currency: 'USD',
  status: 'COMPLETED',
  captureStatus: 'COMPLETED',
}
const opts = { idempotencyKey: 'attempt' }
const evidence = { via: 'return_url' as const, actionId: 'order_1', params: { token: 'order_1' } }
const setup = (order: PayPalOrder = base) => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async () => Response.json(order))
  return {
    fetch,
    provider: createPayPalProvider({
      config: { baseUrl: 'https://shop.test' },
      fetch,
      uuid: () => 'uuid',
      now: Date.now,
      log: { debug() {}, warn() {}, error() {} },
    }),
  }
}
it.each([
  ['COMPLETED', 'succeeded'],
  ['PENDING', 'processing'],
  ['DECLINED', 'declined'],
  ['DENIED', 'declined'],
  ['FAILED', 'declined'],
  ['REFUNDED', 'declined'],
  ['PARTIALLY_REFUNDED', 'declined'],
] as [PayPalCaptureStatus, string][])(
  'order COMPLETED with capture %s produces %s',
  async (captureStatus, expected) => {
    const { provider } = setup({ ...base, captureStatus })
    expect((await provider.resume('order_1', evidence, opts)).status).toBe(expected)
  },
)
it('a completed order without capture proof is not paid', async () => {
  const { provider } = setup({ ...base, captureStatus: undefined })
  await expect(provider.resume('order_1', evidence, opts)).resolves.toMatchObject({
    status: 'error',
    error: { code: 'capture_unverified' },
  })
  await expect(provider.getIntent('order_1', opts)).resolves.toMatchObject({ status: 'processing' })
})
it('captures an approved order once and verifies its capture response', async () => {
  const { provider, fetch } = setup()
  fetch.mockResolvedValueOnce(
    Response.json({ ...base, status: 'APPROVED', captureStatus: undefined }),
  )
  await expect(provider.resume('order_1', evidence, opts)).resolves.toMatchObject({
    status: 'succeeded',
  })
  expect(fetch.mock.calls[1][0]).toBe('https://shop.test/paypal/orders/order_1/capture')
  expect(new Headers(fetch.mock.calls[1][1]?.headers).get('Idempotency-Key')).toBe(
    'attempt:capture:order_1',
  )
})
it('does not capture an already completed order again', async () => {
  const { provider, fetch } = setup()
  await provider.resume('order_1', evidence, opts)
  await provider.resume('order_1', evidence, opts)
  expect(fetch.mock.calls.every(([, init]) => init?.method === 'GET')).toBe(true)
})
it('does not capture an unapproved order just because a browser returned', async () => {
  const { provider, fetch } = setup({ ...base, status: 'CREATED', captureStatus: undefined })
  await expect(provider.resume('order_1', evidence, opts)).resolves.toMatchObject({
    status: 'error',
    error: { code: 'not_approved' },
  })
  expect(fetch).toHaveBeenCalledOnce()
})
it('rejects returns for a different order before requesting capture', async () => {
  const { provider, fetch } = setup()
  await expect(
    provider.resume('order_1', { ...evidence, params: { token: 'another_order' } }, opts),
  ).resolves.toMatchObject({ error: { code: 'invalid_evidence' } })
  expect(fetch).not.toHaveBeenCalled()
})
it('declares no fake void operation for an Orders v2 approval', () => {
  expect(payPalProvider.capabilities.cancel).toBe(false)
  expect(setup().provider.cancel).toBeUndefined()
})
