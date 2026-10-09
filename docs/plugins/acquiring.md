# Form acquiring

> [Русская версия](../ru/plugins/acquiring.md)

Reference adapter for **3-D Secure 1 redirect, iframe or top window**. Provider id: `acquiring`. Instruments: **card**.

This package implements checkout-kit's example merchant protocol. It is useful as an executable integration template and with `@checkout-kit/testing/backend`; it is not a certified adapter for a named bank or payment network. For Stripe, Adyen and PayPal, use their dedicated provider packages.

## Configure

Follow the [installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html) for package archives or registry setup.

```ts
import { defineProvider } from '@checkout-kit/core'
import type { AcquiringConfig } from '@checkout-kit/provider-acquiring'

const config: AcquiringConfig = {
  baseUrl: '/acquiring',
  userName: 'demo-api',
  password: 'demo',
  acsOrigin: 'https://acs.example.com',
}

const provider = defineProvider({
  id: 'acquiring',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-acquiring'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

`baseUrl` is your merchant API. Optional `headers` carry merchant session or CSRF headers; `credentials` controls cookies. Keep payment-service secrets on the server. The host supplies the browser runtime, return URL and any SDK adapter.

## Merchant API

Paths below are relative to `baseUrl`. Authenticate the shopper, resolve price from `planId`, verify order ownership, and enforce allowed state transitions on the server. Monetary amounts are integers in the currency's minor units.

| Method | Path                              | Contract                                                                 |
| ------ | --------------------------------- | ------------------------------------------------------------------------ |
| POST   | `/rest/register.do`               | Form `{ planId, orderNumber, currency, amount }`; return `{ orderId }`.  |
| POST   | `/rest/getOrderStatusExtended.do` | Form `{ orderId }`; return verified numeric status and active challenge. |
| POST   | `/rest/paymentorder.do`           | Form `{ MDORDER, $PAN, $EXPIRY, $CVC }`; return result or challenge.     |
| POST   | `/rest/finish3ds.do`              | Form `{ MD, PaRes }`; finish authentication.                             |
| POST   | `/rest/reverse.do`                | Form `{ orderId }`; cancel an unfinished order.                          |

All requests are form-encoded and include `userName` / `password`. The shown credentials belong only to the simulator. A browser integration must point at a merchant proxy that injects real credentials server-side and validates the request. Never put real acquirer credentials in this config.

Status responses include `errorCode`, `orderStatus`, `amount`, `currency` and optional issuer error fields. While `orderStatus === 5`, the proxy must also include the active `MD`, `acsUrl` and `paReq`, bound to that order; the adapter uses them to recover a challenge after reload and reject another order's evidence. Numeric currencies supported by this example are USD/840, EUR/978 and GBP/826.

The demo synthesizes `PaRes` from a test verdict. A real acquirer requires its authenticated, signed result and its own supported protocol; implement that exchange on your server. Do not forward the demo verdict as proof of payment.

## Retries and verification

The adapter reads the authoritative order before reopening payment, spending another token or canceling. Successful, declined and canceled orders retain their outcome; processing orders continue to be polled. A retry after a lost reply checks the same order before issuing another mutation.

Creation uses `orderNumber` in the form body for idempotency. Your proxy must make confirmation and authentication settlement atomic for each order; the simulated acquirer is a protocol fixture, not a production gateway.

Run this package's contract and regression tests from the repository:

```sh
npm ci
npm test -- packages/provider-acquiring
```

[Provider guide](https://pavel-labs.github.io/checkout-kit/plugins/acquiring.html) · [Architecture](https://pavel-labs.github.io/checkout-kit/architecture.html)

## Run and verify

Run `npm run dev:mock` plus `npm run dev:bank`, or use [the site demo](/demo/). This is a reference merchant protocol, not a named-bank integration. [Environment](./setup.md), [runtime](../runtime.md) and [testing](../testing.md) cover mounts, recovery and contract verification.
