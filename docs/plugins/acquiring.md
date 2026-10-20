# Form acquiring

> [Русская версия](../ru/plugins/acquiring.md)

This is an **example adapter** for a bank (acquirer) whose API takes HTML form fields, uses numbers as statuses and the old bank check **3-D Secure 1**, shown in an iframe or in the whole window.

- Provider id: `acquiring`.
- What the shopper pays with (instrument): a card.

The package shows checkout kit's example server protocol. Use it as a working template for your own integration, together with the fake server from `@checkout-kit/testing/backend`. It is **not** a certified adapter for any real bank or payment network. For Stripe, Adyen and PayPal, use their own provider packages.

## Install from npm

```sh
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-acquiring
```

[npm package](https://www.npmjs.com/package/@checkout-kit/provider-acquiring) · [All installation options](../getting-started.md#install-from-npm)

## Configure

To install the packages, follow the [installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html).

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

- `baseUrl` is the address of your server API.
- `headers` (optional) can carry your session or CSRF headers. `credentials` controls whether cookies are sent.
- Keep the payment service's secret keys on your server.
- Your app provides the browser runtime, the return address and an SDK adapter, if one is needed.

## Merchant API

The paths below are relative to `baseUrl`. On your server: log in the shopper, take the price from `planId`, check that the order belongs to this shopper, and allow only valid status changes. Amounts are integers in the smallest currency unit (for example, cents).

| Method | Path                              | What it does                                                                      |
| ------ | --------------------------------- | --------------------------------------------------------------------------------- |
| POST   | `/rest/register.do`               | Form `{ planId, orderNumber, currency, amount }`. Returns `{ orderId }`.          |
| POST   | `/rest/getOrderStatusExtended.do` | Form `{ orderId }`. Returns the checked numeric status and the active bank check. |
| POST   | `/rest/paymentorder.do`           | Form `{ MDORDER, $PAN, $EXPIRY, $CVC }`. Returns the result or a bank check.      |
| POST   | `/rest/finish3ds.do`              | Form `{ MD, PaRes }`. Finishes the bank check.                                    |
| POST   | `/rest/reverse.do`                | Form `{ orderId }`. Cancels an order that is not finished yet.                    |

Responses for a payment, order or charge contain `{ id, amount, currency, status, error? }`. Statuses are checkout kit's `PaymentStatus` values. A decline may have `{ code?, message }` in `error`.

**Login and password.** All requests are sent as form data and contain `userName` / `password`. The values in the example above work **only** with the simulator. In a browser integration, `baseUrl` must point to a proxy on your server. The proxy adds the real login and password on the server side and checks the request. Never put real bank credentials into this config.

**Statuses.** Responses contain `errorCode`, `orderStatus`, `amount`, `currency` and optional error fields from the bank. While `orderStatus === 5`, the proxy must also return the active `MD`, `acsUrl` and `paReq` of this order. With them, the adapter can continue the bank check after a page reload and reject step data from another order. This example supports these currency codes: USD/840, EUR/978 and GBP/826.

**The bank check result.** The demo makes up `PaRes` from a test answer. A real bank requires its own signed result and its own protocol; implement this exchange on your server. Never treat the demo answer as proof of payment.

## Retries and verification

Before it reopens a payment, uses another token or cancels, the adapter reads the real order from the server. Successful, declined and canceled orders keep their result. For orders that are still processing, the status keeps being checked. After a lost reply, a retry first checks the same order and only then sends another change.

**One payment per order.** For creation, the `orderNumber` field in the form protects against duplicates. Your proxy must make confirmation and the end of the bank check atomic for each order. The simulated bank only shows the protocol; it is not a production gateway.

To run this package's contract and regression tests in the repository:

```sh
npm ci
npm test -- packages/provider-acquiring
```

[Provider guide](https://pavel-labs.github.io/checkout-kit/plugins/acquiring.html) · [Architecture](https://pavel-labs.github.io/checkout-kit/architecture.html)

## Run and verify

Run `npm run dev:mock` and `npm run dev:bank`, or open [the site demo](/demo/). This is an example protocol, not an integration with a real bank. [Simulator setup](./setup.md), [runtime](../runtime.md) and [testing](../testing.md) explain where steps are shown, how recovery works and how the contract is checked.
