# @checkout-kit/provider-hosted-fields

Reference adapter for **provider fields, inline iframe**. Provider id: `hostedfields`. Instruments: **none**.

This package implements checkout-kit's example merchant protocol. It is useful as an executable integration template and with `@checkout-kit/testing/backend`; it is not a certified adapter for a named bank or payment network. For Stripe, Adyen and PayPal, use their dedicated provider packages.

## Configure

Follow the [installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html) for package archives or registry setup.

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

`baseUrl` is your merchant API. Optional `headers` carry merchant session or CSRF headers; `credentials` controls cookies. Keep payment-service secrets on the server. The host supplies the browser runtime, return URL and any SDK adapter.

## Merchant API

Paths below are relative to `baseUrl`. Authenticate the shopper, resolve price from `planId`, verify order ownership, and enforce allowed state transitions on the server. Monetary amounts are integers in the currency's minor units.

| Method | Path                                | Contract                                               |
| ------ | ----------------------------------- | ------------------------------------------------------ |
| POST   | `/hosted-fields/charges`            | `{ planId }`; return a charge.                         |
| GET    | `/hosted-fields/charges/:id`        | Authoritative charge.                                  |
| POST   | `/hosted-fields/charges/:id/pay`    | `{ token }`; exchange the opaque token on your server. |
| POST   | `/hosted-fields/charges/:id/cancel` | Cancel an unfinished charge.                           |

Intent/order/charge responses include `{ id, amount, currency, status, error? }`. Statuses use checkout-kit's `PaymentStatus`; declines may include `{ code?, message }` in `error`.

The provider frame receives `actionId` and `fields` query parameters. It answers with a `ck-fields-token` postMessage containing that `actionId` and a nonempty opaque `token`. The runtime checks the frame sender and exact origin; the adapter also checks the origin and payment id. The server must verify token ownership and usage.

## Retries and verification

The adapter reads the authoritative order before reopening payment, spending another token or canceling. Successful, declined and canceled orders retain their outcome; processing orders continue to be polled. A retry after a lost reply checks the same order before issuing another mutation.

Creation forwards `CallOptions.idempotencyKey` as `Idempotency-Key`. Mutations scope it with an operation and intent id (`:confirm:`, `:resume:`, `:pay:`, `:code:` or `:cancel:` as applicable). Your backend must honor the key and reject a changed payload under the same key; sending a header alone cannot guarantee a single charge.

Run this package's contract and regression tests from the repository:

```sh
npm ci
npm test -- packages/provider-hosted-fields
```

[Provider guide](https://pavel-labs.github.io/checkout-kit/plugins/hosted-fields.html) · [Architecture](https://pavel-labs.github.io/checkout-kit/architecture.html)
