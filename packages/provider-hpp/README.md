# @checkout-kit/provider-hpp

This is an **example adapter** for a **payment page on the bank's site**. The whole window goes there, and the shopper comes back afterwards.

- Provider id: `hpp`.
- What the shopper pays with (instrument): none — the shopper enters everything on the bank's page.

The package shows checkout kit's example server protocol. Use it as a working template for your own integration, together with the fake server from `@checkout-kit/testing/backend`. It is **not** a certified adapter for any real bank or payment network. For Stripe, Adyen and PayPal, use their own provider packages.

## Install from npm

```bash
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-hpp
```

[npm package](https://www.npmjs.com/package/@checkout-kit/provider-hpp) · [Installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html#install-from-npm)

## Configure

```ts
import { defineProvider } from '@checkout-kit/core'
import type { HostedPageConfig } from '@checkout-kit/provider-hpp'

const config: HostedPageConfig = { baseUrl: '/api', pageUrl: 'https://bank.example.com/pay' }

const provider = defineProvider({
  id: 'hpp',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-hpp'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

- `baseUrl` is the address of your server API.
- `headers` (optional) can carry your session or CSRF headers. `credentials` controls whether cookies are sent.
- Keep the payment service's secret keys on your server.
- Your app provides the browser runtime, the return address and an SDK adapter, if one is needed.

## Merchant API

The paths below are relative to `baseUrl`. On your server: log in the shopper, take the price from `planId`, check that the order belongs to this shopper, and allow only valid status changes. Amounts are integers in the smallest currency unit (for example, cents).

| Method | Path                 | What it does                                             |
| ------ | -------------------- | -------------------------------------------------------- |
| POST   | `/hosted/orders`     | Takes `{ planId }`, returns `{ orderId }`.               |
| GET    | `/hosted/orders/:id` | Returns the real order: id, amount, currency and status. |

Responses for a payment, order or charge contain `{ id, amount, currency, status, error? }`. Statuses are checkout kit's `PaymentStatus` values. A decline may have `{ code?, message }` in `error`.

**How it works.** The runner opens `pageUrl` with `orderId` and `returnUrl`. On the way back, the step data must have `via: 'return_url'` and the order id as `actionId`. The adapter **ignores** any payment status written in the address and reads the order again. This example has no cancel.

## Retries and verification

Before it reopens a payment, uses another token or cancels, the adapter reads the real order from the server. Successful, declined and canceled orders keep their result. For orders that are still processing, the status keeps being checked. After a lost reply, a retry first checks the same order and only then sends another change.

**Idempotency.** On creation, `CallOptions.idempotencyKey` is sent as the `Idempotency-Key` header. For other changes, the key is extended with the operation and the payment id (`:confirm:`, `:resume:`, `:pay:`, `:code:` or `:cancel:`). Your server must respect the key and reject a request that has the same key but different data. The header alone does not guarantee a single charge.

To run this package's contract and regression tests in the repository:

```sh
npm ci
npm test -- packages/provider-hpp
```

[Provider guide](https://pavel-labs.github.io/checkout-kit/plugins/hosted-page.html) · [Architecture](https://pavel-labs.github.io/checkout-kit/architecture.html)
