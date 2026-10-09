# @checkout-kit/provider-bank-transfer

Reference adapter for **QR, code or instructions, completed by polling**. Provider id: `transfer`. Instruments: **none**.

This package implements checkout-kit's example merchant protocol. It is useful as an executable integration template and with `@checkout-kit/testing/backend`; it is not a certified adapter for a named bank or payment network. For Stripe, Adyen and PayPal, use their dedicated provider packages.

## Configure

Follow the [installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html) for package archives or registry setup.

```ts
import { defineProvider } from '@checkout-kit/core'
import type { BankTransferConfig } from '@checkout-kit/provider-bank-transfer'

const config: BankTransferConfig = {
  baseUrl: '/api',
  format: 'qr',
  instructions: 'Pay in your banking app.',
}

const provider = defineProvider({
  id: 'transfer',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-bank-transfer'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

`baseUrl` is your merchant API. Optional `headers` carry merchant session or CSRF headers; `credentials` controls cookies. Keep payment-service secrets on the server. The host supplies the browser runtime, return URL and any SDK adapter.

## Merchant API

Paths below are relative to `baseUrl`. Authenticate the shopper, resolve price from `planId`, verify order ownership, and enforce allowed state transitions on the server. Monetary amounts are integers in the currency's minor units.

| Method | Path                          | Contract                                                         |
| ------ | ----------------------------- | ---------------------------------------------------------------- |
| POST   | `/transfer/orders`            | `{ planId }`; return an order.                                   |
| GET    | `/transfer/orders/:id`        | Authoritative order.                                             |
| POST   | `/transfer/orders/:id/code`   | Return `{ order, payload, qrImageUrl?, deeplink?, expiresAt? }`. |
| POST   | `/transfer/orders/:id/cancel` | Cancel an unfinished order.                                      |

Intent/order/charge responses include `{ id, amount, currency, status, error? }`. Statuses use checkout-kit's `PaymentStatus`; declines may include `{ code?, message }` in `error`.

The default polling interval is 2 seconds and timeout is 15 minutes; set `poll: { intervalMs, timeoutMs }` to match your backend. Completion evidence must use `via: 'poll'` and the order id as `actionId`. A shopper saying they paid never settles the order. Scheme confirmation belongs to your server.

## Retries and verification

The adapter reads the authoritative order before reopening payment, spending another token or canceling. Successful, declined and canceled orders retain their outcome; processing orders continue to be polled. A retry after a lost reply checks the same order before issuing another mutation.

Creation forwards `CallOptions.idempotencyKey` as `Idempotency-Key`. Mutations scope it with an operation and intent id (`:confirm:`, `:resume:`, `:pay:`, `:code:` or `:cancel:` as applicable). Your backend must honor the key and reject a changed payload under the same key; sending a header alone cannot guarantee a single charge.

Run this package's contract and regression tests from the repository:

```sh
npm ci
npm test -- packages/provider-bank-transfer
```

[Provider guide](https://pavel-labs.github.io/checkout-kit/plugins/bank-transfer.html) · [Architecture](https://pavel-labs.github.io/checkout-kit/architecture.html)
