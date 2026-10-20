# Hosted fields

> [Русская версия](../ru/plugins/hosted-fields.md)

This is an **example adapter** for **card fields from the provider**, shown in an iframe right on your page. Your code never sees the card number; it gets only a token.

- Provider id: `hostedfields`.
- What the shopper pays with (instrument): none — the provider's frame collects the card.

The package shows checkout kit's example server protocol. Use it as a working template for your own integration, together with the fake server from `@checkout-kit/testing/backend`. It is **not** a certified adapter for any real bank or payment network. For Stripe, Adyen and PayPal, use their own provider packages.

## Install from npm

```sh
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-hosted-fields
```

[npm package](https://www.npmjs.com/package/@checkout-kit/provider-hosted-fields) · [All installation options](../getting-started.md#install-from-npm)

## Configure

To install the packages, follow the [installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html).

```ts
import { defineProvider } from '@checkout-kit/core'
import type { HostedFieldsConfig } from '@checkout-kit/provider-hosted-fields'

const config: HostedFieldsConfig = {
  baseUrl: '/api',
  fieldsUrl: 'https://fields.example.com/card',
  fieldsOrigin: 'https://fields.example.com',
}

const provider = defineProvider({
  id: 'hostedfields',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-hosted-fields'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

- `baseUrl` is the address of your server API.
- `headers` (optional) can carry your session or CSRF headers. `credentials` controls whether cookies are sent.
- Keep the payment service's secret keys on your server.
- Your app provides the browser runtime, the return address and an SDK adapter, if one is needed.

## Merchant API

The paths below are relative to `baseUrl`. On your server: log in the shopper, take the price from `planId`, check that the order belongs to this shopper, and allow only valid status changes. Amounts are integers in the smallest currency unit (for example, cents).

| Method | Path                                | What it does                                                  |
| ------ | ----------------------------------- | ------------------------------------------------------------- |
| POST   | `/hosted-fields/charges`            | Takes `{ planId }`, returns a charge.                         |
| GET    | `/hosted-fields/charges/:id`        | Returns the real state of the charge.                         |
| POST   | `/hosted-fields/charges/:id/pay`    | Takes `{ token }`. Your server exchanges the token for money. |
| POST   | `/hosted-fields/charges/:id/cancel` | Cancels a charge that is not finished yet.                    |

Responses for a payment, order or charge contain `{ id, amount, currency, status, error? }`. Statuses are checkout kit's `PaymentStatus` values. A decline may have `{ code?, message }` in `error`.

**How it works.** The provider's frame gets the query parameters `actionId` and `fields`. It answers with a `ck-fields-token` message (`postMessage`) that contains the same `actionId` and a non-empty `token`. The runtime checks the sender frame and its exact origin. The adapter also checks the origin and the payment id. Your server must check who owns the token and that it was not used before.

## Retries and verification

Before it reopens a payment, uses another token or cancels, the adapter reads the real order from the server. Successful, declined and canceled orders keep their result. For orders that are still processing, the status keeps being checked. After a lost reply, a retry first checks the same order and only then sends another change.

**Idempotency.** On creation, `CallOptions.idempotencyKey` is sent as the `Idempotency-Key` header. For other changes, the key is extended with the operation and the payment id (`:confirm:`, `:resume:`, `:pay:`, `:code:` or `:cancel:`). Your server must respect the key and reject a request that has the same key but different data. The header alone does not guarantee a single charge.

To run this package's contract and regression tests in the repository:

```sh
npm ci
npm test -- packages/provider-hosted-fields
```

[Provider guide](https://pavel-labs.github.io/checkout-kit/plugins/hosted-fields.html) · [Architecture](https://pavel-labs.github.io/checkout-kit/architecture.html)

## Run and verify

Run `npm run dev:mock` and `npm run dev:bank`, or open [the site demo](/demo/). This is an example protocol, not an integration with a real bank. [Simulator setup](./setup.md), [runtime](../runtime.md) and [testing](../testing.md) explain where steps are shown, how recovery works and how the contract is checked.
