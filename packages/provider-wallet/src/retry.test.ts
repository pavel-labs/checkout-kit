import { describe, expect, it, vi } from 'vitest'
import type { ProviderContext } from '@checkout-kit/core'
import { createWalletProvider, type WalletConfig } from './provider'

const config: WalletConfig = {
  baseUrl: 'https://merchant.test/api',
  sdk: 'wallet',
  scriptUrl: 'https://wallet.test/sdk.js',
  merchantName: 'Shop',
  credentials: 'include',
  headers: { 'X-CSRF-Token': 'session-token' },
}

const context = (fetch: typeof globalThis.fetch): ProviderContext<WalletConfig> => ({
  config,
  fetch,
  uuid: () => 'uuid',
  now: Date.now,
  log: { debug() {}, warn() {}, error() {} },
})

describe('wallet token and retry boundary', () => {
  it.each([null, [], 'token', {}, { walletToken: 42 }, { walletToken: '   ' }])(
    'rejects a malformed SDK token before contacting the merchant API: %j',
    async (payload) => {
      const fetch = vi.fn<typeof globalThis.fetch>()
      const provider = createWalletProvider(context(fetch))
      const result = await provider.resume(
        'charge',
        { via: 'sdk_callback', actionId: 'charge', payload },
        { idempotencyKey: 'attempt' },
      )
      expect(result).toMatchObject({ status: 'error', error: { code: 'missing_wallet_token' } })
      expect(fetch).not.toHaveBeenCalled()
    },
  )

  it('recovers a lost pay response without spending the token a second time', async () => {
    const id = 'charge/with?reserved'
    const charge = { id, amount: 2500, currency: 'USD', status: 'requires_payment_method' }
    let payCalls = 0
    const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
      expect(String(url)).toContain('/wallet/charges/charge%2Fwith%3Freserved')
      expect(init?.credentials).toBe('include')
      expect(new Headers(init?.headers).get('X-CSRF-Token')).toBe('session-token')
      if (init?.method === 'POST') {
        payCalls += 1
        expect(new Headers(init.headers).get('Idempotency-Key')).toBe(`attempt:pay:${id}`)
        charge.status = 'succeeded'
        throw new TypeError('The response was lost after payment')
      }
      return Response.json(charge)
    })
    const provider = createWalletProvider(context(fetch))
    const evidence = {
      via: 'sdk_callback' as const,
      actionId: id,
      payload: { walletToken: 'opaque-token' },
    }
    expect((await provider.resume(id, evidence, { idempotencyKey: 'attempt' })).status).toBe(
      'error',
    )
    expect((await provider.resume(id, evidence, { idempotencyKey: 'attempt' })).status).toBe(
      'succeeded',
    )
    expect(payCalls).toBe(1)
  })
})
