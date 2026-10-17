# JSON PSP

> [Русская версия](../ru/plugins/psp.md)

This is an **example adapter** for a payment provider with a JSON API: card payments, saved card tokens and the bank check **3-D Secure 2**, shown in an iframe or in the whole window.

- Provider id: `psp`.
- What the shopper pays with (instrument): a card, or a saved card token.

The package shows checkout kit's example server protocol. Use it as a working template for your own integration, together with the fake server from `@checkout-kit/testing/backend`. It is **not** a certified adapter for any real bank or payment network. For Stripe, Adyen and PayPal, use their own provider packages.

## Configure

To install the packages, follow the [installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html).

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

- `baseUrl` is the address of your server API.
- `headers` (optional) can carry your session or CSRF headers. `credentials` controls whether cookies are sent.
- Keep the payment service's secret keys on your server.
- Your app provides the browser runtime, the return address and an SDK adapter, if one is needed.

## Merchant API

The paths below are relative to `baseUrl`. On your server: log in the shopper, take the price from `planId`, check that the order belongs to this shopper, and allow only valid status changes. Amounts are integers in the smallest currency unit (for example, cents).

| Method | Path                           | What it does                                                             |
| ------ | ------------------------------ | ------------------------------------------------------------------------ |
| POST   | `/payment-intents`             | Creates a payment from `{ planId }` and returns it.                      |
| GET    | `/payment-intents/:id`         | Returns the real state of the payment, including the active bank check.  |
| POST   | `/payment-intents/:id/confirm` | Takes `{ cardNumber }` or `{ paymentMethodId }` and returns the payment. |
| POST   | `/3ds/challenge/:id/complete`  | Simulator only: takes `{ outcome }`, returns `{ paymentIntent }`.        |
| POST   | `/payment-intents/:id/cancel`  | Cancels a payment that is not finished yet.                              |

Responses for a payment, order or charge contain `{ id, amount, currency, status, error? }`. Statuses are checkout kit's `PaymentStatus` values. A decline may have `{ code?, message }` in `error`.

**Bank check (3DS).** If the payment needs a bank check, the response contains `nextAction.three_d_secure.challengeId`. Before finishing the check, the adapter makes sure this id matches the step that came back.

In the simulator, the `{ outcome }` request plays the role of a test bank page (ACS). In a real integration, your server must check the result of the bank check itself. Never decide it from `transStatus` sent by the browser.

## Retries and verification

Before it reopens a payment, uses another token or cancels, the adapter reads the real order from the server. Successful, declined and canceled orders keep their result. For orders that are still processing, the status keeps being checked. After a lost reply, a retry first checks the same order and only then sends another change.

**Idempotency.** On creation, `CallOptions.idempotencyKey` is sent as the `Idempotency-Key` header. For other changes, the key is extended with the operation and the payment id (`:confirm:`, `:resume:`, `:pay:`, `:code:` or `:cancel:`). Your server must respect the key and reject a request that has the same key but different data. The header alone does not guarantee a single charge.

To run this package's contract and regression tests in the repository:

```sh
npm ci
npm test -- packages/provider-psp
```

[Provider guide](https://pavel-labs.github.io/checkout-kit/plugins/psp.html) · [Architecture](https://pavel-labs.github.io/checkout-kit/architecture.html)

## Run and verify

Run `npm run dev:mock` and `npm run dev:bank`, or open [the site demo](/demo/). This is an example protocol, not an integration with a real bank. [Simulator setup](./setup.md), [runtime](../runtime.md) and [testing](../testing.md) explain where steps are shown, how recovery works and how the contract is checked.
