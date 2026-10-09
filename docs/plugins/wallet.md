# Wallet SDK

> [Русская версия](../ru/plugins/wallet.md)

Reference adapter for **registered wallet SDK, no kit-owned surface**. Provider id: `wallet`. Instruments: **none**.

This package implements checkout-kit's example merchant protocol. It is useful as an executable integration template and with `@checkout-kit/testing/backend`; it is not a certified adapter for a named bank or payment network. For Stripe, Adyen and PayPal, use their dedicated provider packages.

## Configure

Follow the [installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html) for package archives or registry setup.

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

`baseUrl` is your merchant API. Optional `headers` carry merchant session or CSRF headers; `credentials` controls cookies. Keep payment-service secrets on the server. The host supplies the browser runtime, return URL and any SDK adapter.

## Merchant API

Paths below are relative to `baseUrl`. Authenticate the shopper, resolve price from `planId`, verify order ownership, and enforce allowed state transitions on the server. Monetary amounts are integers in the currency's minor units.

| Method | Path                         | Contract                                             |
| ------ | ---------------------------- | ---------------------------------------------------- |
| POST   | `/wallet/charges`            | `{ planId }`; return a charge.                       |
| GET    | `/wallet/charges/:id`        | Authoritative charge.                                |
| POST   | `/wallet/charges/:id/pay`    | `{ walletToken }`; verify and charge on your server. |
| POST   | `/wallet/charges/:id/cancel` | Cancel an unfinished charge.                         |

Intent/order/charge responses include `{ id, amount, currency, status, error? }`. Statuses use checkout-kit's `PaymentStatus`; declines may include `{ code?, message }` in `error`.

Register an SDK adapter named by `sdk` in `createBrowserRuntime({ sdk: { adapters: [...] }, ... })`. Its `request(params, signal)` method receives merchant name, amount and currency and returns `{ walletToken: 'opaque-token' }`. Numeric, empty or whitespace-only tokens are refused before an API call. This package does not implement Apple Pay or Google Pay SDKs itself.

## Retries and verification

The adapter reads the authoritative order before reopening payment, spending another token or canceling. Successful, declined and canceled orders retain their outcome; processing orders continue to be polled. A retry after a lost reply checks the same order before issuing another mutation.

Creation forwards `CallOptions.idempotencyKey` as `Idempotency-Key`. Mutations scope it with an operation and intent id (`:confirm:`, `:resume:`, `:pay:`, `:code:` or `:cancel:` as applicable). Your backend must honor the key and reject a changed payload under the same key; sending a header alone cannot guarantee a single charge.

Run this package's contract and regression tests from the repository:

```sh
npm ci
npm test -- packages/provider-wallet
```

[Provider guide](https://pavel-labs.github.io/checkout-kit/plugins/wallet.html) · [Architecture](https://pavel-labs.github.io/checkout-kit/architecture.html)

## Run and verify

Run `npm run dev:mock` plus `npm run dev:bank`, or use [the site demo](/demo/). This is a reference merchant protocol, not a named-bank integration. [Environment](./setup.md), [runtime](../runtime.md) and [testing](../testing.md) cover mounts, recovery and contract verification.
