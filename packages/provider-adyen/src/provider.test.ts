import { expect, it, vi } from 'vitest'
import { createAdyenProvider, type AdyenPayment } from './provider'
import type { CardExpiration, CardNumber, CvcCode } from '@checkout-kit/core'
const dto: AdyenPayment = {
  id: 'payment_1',
  amount: 1999,
  currency: 'USD',
  resultCode: 'Authorised',
}
const opts = { idempotencyKey: 'attempt' }
const token = { kind: 'token' as const, token: 'saved_1' }
const setup = (response: AdyenPayment = dto) => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async () => Response.json(response))
  return {
    fetch,
    provider: createAdyenProvider({
      config: { baseUrl: 'https://shop.test/adyen' },
      fetch,
      uuid: () => 'uuid',
      now: Date.now,
      log: { debug() {}, warn() {}, error() {} },
    }),
  }
}
it.each([
  ['Authorised', 'succeeded'],
  ['Pending', 'processing'],
  ['Received', 'processing'],
  ['Refused', 'declined'],
  ['Cancelled', 'error'],
  ['Error', 'error'],
  ['Unexpected', 'error'],
])('maps %s to %s', async (resultCode, expected) => {
  expect(
    (await setup({ ...dto, resultCode }).provider.confirm('payment_1', token, opts)).status,
  ).toBe(expected)
})
it('preserves the full SDK action, including paymentData', async () => {
  const action = {
    type: 'threeDS2',
    subtype: 'challenge',
    token: 'sdk_token',
    paymentData: 'opaque_data',
    authorisationToken: 'opaque_authorisation',
  }
  const { provider } = setup({ ...dto, resultCode: 'ChallengeShopper', action })
  await expect(provider.confirm('payment_1', token, opts)).resolves.toMatchObject({
    action: { kind: 'sdk_handoff', params: { action } },
  })
})
it('sends encrypted Adyen component data and ignores browser-supplied amounts', async () => {
  const { provider, fetch } = setup()
  const paymentMethod = { type: 'scheme', encryptedCardNumber: 'encrypted' }
  await provider.confirm(
    'payment_1',
    {
      kind: 'wallet',
      walletId: 'adyen',
      payload: { paymentMethod, browserInfo: { userAgent: 'browser' }, amount: 1 },
    },
    opts,
  )
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
    paymentMethod,
    browserInfo: { userAgent: 'browser' },
  })
})
it('uses a four-digit expiry year for the raw card adapter', async () => {
  const { provider, fetch } = setup()
  await provider.confirm(
    'payment_1',
    {
      kind: 'card',
      number: '4242 4242 4242 4242' as CardNumber,
      exp: '12/30' as CardExpiration,
      cvc: '123' as CvcCode,
    },
    opts,
  )
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).paymentMethod).toMatchObject({
    expiryYear: '2030',
    number: '4242424242424242',
  })
})
it('binds details to an issued action and forwards only redirect evidence', async () => {
  const { provider, fetch } = setup({
    ...dto,
    resultCode: 'RedirectShopper',
    action: { type: 'redirect', url: 'https://bank.test', paymentData: 'opaque' },
  })
  const result = await provider.confirm('payment_1', token, opts)
  if (result.status !== 'requires_action') throw new Error('Expected an action')
  await expect(
    provider.resume(
      'payment_1',
      { via: 'return_url', actionId: 'forged', params: { redirectResult: 'data' } },
      opts,
    ),
  ).resolves.toMatchObject({ error: { code: 'invalid_evidence' } })
  expect(fetch).toHaveBeenCalledOnce()
  await provider.resume(
    'payment_1',
    {
      via: 'return_url',
      actionId: result.action.id,
      params: { redirectResult: 'verified_data', status: 'Authorised', planId: 'cheap' },
    },
    opts,
  )
  expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toEqual({
    details: { redirectResult: 'verified_data' },
  })
})
it('remembers actions reread during redirect hydration', async () => {
  const { provider, fetch } = setup({
    ...dto,
    resultCode: 'RedirectShopper',
    action: { type: 'redirect', url: 'https://bank.test' },
  })
  await provider.getIntent('payment_1', opts)
  await provider.resume(
    'payment_1',
    {
      via: 'return_url',
      actionId: 'payment_1:redirect:RedirectShopper',
      params: { redirectResult: 'verified' },
    },
    opts,
  )
  expect(fetch).toHaveBeenCalledTimes(2)
})
it('unwraps the onAdditionalDetails data before posting details', async () => {
  const { provider, fetch } = setup({
    ...dto,
    resultCode: 'ChallengeShopper',
    action: { type: 'threeDS2', token: 'opaque' },
  })
  const result = await provider.confirm('payment_1', token, opts)
  if (result.status !== 'requires_action') throw new Error('Expected an action')
  await provider.resume(
    'payment_1',
    {
      via: 'sdk_callback',
      actionId: result.action.id,
      payload: { details: { threeDSResult: 'verified' }, paymentData: 'not_trusted_from_browser' },
    },
    opts,
  )
  expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toEqual({
    details: { threeDSResult: 'verified' },
  })
})
