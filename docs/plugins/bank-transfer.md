# Bank transfer

> [Русская версия](../ru/plugins/bank-transfer.md)

This is an **example adapter** for a **bank transfer**: the shopper sees a QR code, a payment code or instructions, pays in their banking app, and the engine keeps checking the status until the money arrives.

- Provider id: `transfer`.
- What the shopper pays with (instrument): none.

The package shows checkout kit's example server protocol. Use it as a working template for your own integration, together with the fake server from `@checkout-kit/testing/backend`. It is **not** a certified adapter for any real bank or payment network. For Stripe, Adyen and PayPal, use their own provider packages.

## Configure

To install the packages, follow the [installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html).

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

- `baseUrl` is the address of your server API.
- `headers` (optional) can carry your session or CSRF headers. `credentials` controls whether cookies are sent.
- Keep the payment service's secret keys on your server.
- Your app provides the browser runtime, the return address and an SDK adapter, if one is needed.

## Merchant API

The paths below are relative to `baseUrl`. On your server: log in the shopper, take the price from `planId`, check that the order belongs to this shopper, and allow only valid status changes. Amounts are integers in the smallest currency unit (for example, cents).

| Method | Path                          | What it does                                                      |
| ------ | ----------------------------- | ----------------------------------------------------------------- |
| POST   | `/transfer/orders`            | Takes `{ planId }`, returns an order.                             |
| GET    | `/transfer/orders/:id`        | Returns the real state of the order.                              |
| POST   | `/transfer/orders/:id/code`   | Returns `{ order, payload, qrImageUrl?, deeplink?, expiresAt? }`. |
| POST   | `/transfer/orders/:id/cancel` | Cancels an order that is not finished yet.                        |

Responses for a payment, order or charge contain `{ id, amount, currency, status, error? }`. Statuses are checkout kit's `PaymentStatus` values. A decline may have `{ code?, message }` in `error`.

**Status checks.** By default the status is checked every 2 seconds, for up to 15 minutes. Change this with `poll: { intervalMs, timeoutMs }` to match your server. The final step data must have `via: 'poll'` and the order id as `actionId`. The order is **never** paid just because the shopper says "I paid". Only your server can confirm the transfer.

## Retries and verification

Before it reopens a payment, uses another token or cancels, the adapter reads the real order from the server. Successful, declined and canceled orders keep their result. For orders that are still processing, the status keeps being checked. After a lost reply, a retry first checks the same order and only then sends another change.

**Idempotency.** On creation, `CallOptions.idempotencyKey` is sent as the `Idempotency-Key` header. For other changes, the key is extended with the operation and the payment id (`:confirm:`, `:resume:`, `:pay:`, `:code:` or `:cancel:`). Your server must respect the key and reject a request that has the same key but different data. The header alone does not guarantee a single charge.

To run this package's contract and regression tests in the repository:

```sh
npm ci
npm test -- packages/provider-bank-transfer
```

[Provider guide](https://pavel-labs.github.io/checkout-kit/plugins/bank-transfer.html) · [Architecture](https://pavel-labs.github.io/checkout-kit/architecture.html)

## Run and verify

Run `npm run dev:mock` and `npm run dev:bank`, or open [the site demo](/demo/). This is an example protocol, not an integration with a real bank. [Simulator setup](./setup.md), [runtime](../runtime.md) and [testing](../testing.md) explain where steps are shown, how recovery works and how the contract is checked.
