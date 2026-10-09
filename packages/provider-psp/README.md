# @checkout-kit/provider-psp

Reference adapter for **3-D Secure 2 redirect, iframe or top window**. Provider id: `psp`. Instruments: **card or saved token**.

This package implements checkout-kit's example merchant protocol. It is useful as an executable integration template and with `@checkout-kit/testing/backend`; it is not a certified adapter for a named bank or payment network. For Stripe, Adyen and PayPal, use their dedicated provider packages.

## Configure

Follow the [installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html) for package archives or registry setup.

```ts
import { defineProvider } from '@checkout-kit/core'
import type { PspConfig } from '@checkout-kit/provider-psp'

const config: PspConfig = { baseUrl: '/api', acsOrigin: 'https://acs.example.com' }

const provider = defineProvider({
  id: 'psp',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-psp'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

`baseUrl` is your merchant API. Optional `headers` carry merchant session or CSRF headers; `credentials` controls cookies. Keep payment-service secrets on the server. The host supplies the browser runtime, return URL and any SDK adapter.

## Merchant API

Paths below are relative to `baseUrl`. Authenticate the shopper, resolve price from `planId`, verify order ownership, and enforce allowed state transitions on the server. Monetary amounts are integers in the currency's minor units.

| Method | Path                           | Contract                                                      |
| ------ | ------------------------------ | ------------------------------------------------------------- |
| POST   | `/payment-intents`             | Create from `{ planId }`; return an intent.                   |
| GET    | `/payment-intents/:id`         | Authoritative intent, including its active challenge.         |
| POST   | `/payment-intents/:id/confirm` | `{ cardNumber }` or `{ paymentMethodId }`; return the intent. |
| POST   | `/3ds/challenge/:id/complete`  | Mock `{ outcome }`; return `{ paymentIntent }`.               |
| POST   | `/payment-intents/:id/cancel`  | Cancel an unfinished intent.                                  |

Intent/order/charge responses include `{ id, amount, currency, status, error? }`. Statuses use checkout-kit's `PaymentStatus`; declines may include `{ code?, message }` in `error`.

An intent requiring authentication includes `nextAction.three_d_secure.challengeId`. The adapter checks that this is the evidence's action id before completing it. The simulator's `{ outcome }` exchange represents a test ACS; real authentication must be verified by your backend, not inferred from a browser `transStatus`.

## Retries and verification

The adapter reads the authoritative order before reopening payment, spending another token or canceling. Successful, declined and canceled orders retain their outcome; processing orders continue to be polled. A retry after a lost reply checks the same order before issuing another mutation.

Creation forwards `CallOptions.idempotencyKey` as `Idempotency-Key`. Mutations scope it with an operation and intent id (`:confirm:`, `:resume:`, `:pay:`, `:code:` or `:cancel:` as applicable). Your backend must honor the key and reject a changed payload under the same key; sending a header alone cannot guarantee a single charge.

Run this package's contract and regression tests from the repository:

```sh
npm ci
npm test -- packages/provider-psp
```

[Provider guide](https://pavel-labs.github.io/checkout-kit/plugins/psp.html) · [Architecture](https://pavel-labs.github.io/checkout-kit/architecture.html)
