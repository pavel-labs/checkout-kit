# @checkout-kit/provider-wallet

This is an **example adapter** for a **wallet SDK** (a JavaScript library of a wallet service) that you register yourself. The kit does not show anything of its own for this step.

- Provider id: `wallet`.
- What the shopper pays with (instrument): none — the wallet SDK gives a token.

The package shows checkout kit's example server protocol. Use it as a working template for your own integration, together with the fake server from `@checkout-kit/testing/backend`. It is **not** a certified adapter for any real bank or payment network. For Stripe, Adyen and PayPal, use their own provider packages.

## Configure

To install the packages, follow the [installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html).

```ts
import { defineProvider } from '@checkout-kit/core'
import type { WalletConfig } from '@checkout-kit/provider-wallet'

const config: WalletConfig = {
  baseUrl: '/api',
  sdk: 'merchant-wallet',
  scriptUrl: 'https://wallet.example.com/sdk.js',
  merchantName: 'Shop',
}

const provider = defineProvider({
  id: 'wallet',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-wallet'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

- `baseUrl` is the address of your server API.
- `headers` (optional) can carry your session or CSRF headers. `credentials` controls whether cookies are sent.
- Keep the payment service's secret keys on your server.
- Your app provides the browser runtime, the return address and an SDK adapter, if one is needed.

## Merchant API

The paths below are relative to `baseUrl`. On your server: log in the shopper, take the price from `planId`, check that the order belongs to this shopper, and allow only valid status changes. Amounts are integers in the smallest currency unit (for example, cents).

| Method | Path                         | What it does                                                    |
| ------ | ---------------------------- | --------------------------------------------------------------- |
| POST   | `/wallet/charges`            | Takes `{ planId }`, returns a charge.                           |
| GET    | `/wallet/charges/:id`        | Returns the real state of the charge.                           |
| POST   | `/wallet/charges/:id/pay`    | Takes `{ walletToken }`. Your server checks it and takes money. |
| POST   | `/wallet/charges/:id/cancel` | Cancels a charge that is not finished yet.                      |

Responses for a payment, order or charge contain `{ id, amount, currency, status, error? }`. Statuses are checkout kit's `PaymentStatus` values. A decline may have `{ code?, message }` in `error`.

**How it works.** Register an SDK adapter with the name from `sdk` in `createBrowserRuntime({ sdk: { adapters: [...] }, ... })`. Its method `request(params, signal)` gets the merchant name, amount and currency, and returns `{ walletToken: 'opaque-token' }`. Tokens that are numbers, empty, or only spaces are rejected before any API call. This package does **not** contain Apple Pay or Google Pay SDKs.

## Retries and verification

Before it reopens a payment, uses another token or cancels, the adapter reads the real order from the server. Successful, declined and canceled orders keep their result. For orders that are still processing, the status keeps being checked. After a lost reply, a retry first checks the same order and only then sends another change.

**Idempotency.** On creation, `CallOptions.idempotencyKey` is sent as the `Idempotency-Key` header. For other changes, the key is extended with the operation and the payment id (`:confirm:`, `:resume:`, `:pay:`, `:code:` or `:cancel:`). Your server must respect the key and reject a request that has the same key but different data. The header alone does not guarantee a single charge.

To run this package's contract and regression tests in the repository:

```sh
npm ci
npm test -- packages/provider-wallet
```

[Provider guide](https://pavel-labs.github.io/checkout-kit/plugins/wallet.html) · [Architecture](https://pavel-labs.github.io/checkout-kit/architecture.html)
