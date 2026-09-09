# Real provider plugins

This folder contains real API adapters for Stripe, Adyen and PayPal, plus
[`usage.ts`](./usage.ts), which registers these adapters alongside all six built-in
checkout-kit providers. Run `npm install` from the repository root and
`npm run examples:typecheck` to check the example.

## Mock React example

Run a browser example without payment credentials:

```powershell
npm install
npm run dev:react -w @checkout-kit/examples
```

Open `http://localhost:5173/`. The app in [`../react/App.tsx`](../react/App.tsx) uses
`CheckoutProvider`, `useCheckout` and `PaymentActionHost`; MSW serves the same mock handlers
used by the package tests. Click each provider button to exercise the same React flow with a
card, hosted fields, wallet, hosted page or QR transfer instrument.

The React page also displays Stripe, Adyen and PayPal. To enable those real adapters, point them
at your backend; the backend must expose the endpoints described below and keep provider keys
server-side:

```powershell
$env:VITE_REAL_PROVIDER_API_BASE_URL = 'http://localhost:4000'
$env:VITE_ADYEN_SCRIPT_URL = 'https://checkoutshopper-test.adyen.com/checkoutshopper/sdk/adyen.js'
npm run dev:server -w @checkout-kit/examples
# in a second terminal:
npm run dev:react -w @checkout-kit/examples
```

Before starting the server, set `STRIPE_SECRET_KEY`, `ADYEN_API_KEY`,
`ADYEN_MERCHANT_ACCOUNT`, `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. The server is in
[`server/index.ts`](../server/index.ts); it exposes separate `/stripe`, `/adyen` and `/paypal`
routes so the three provider protocols cannot be mixed accidentally.

The plugins in `packages/provider-*` are shaped by the demo's mock backend. These are shaped
by the providers.

## What each package is for

| Package                                | Use it when                                             | What it demonstrates                          |
| -------------------------------------- | ------------------------------------------------------- | --------------------------------------------- |
| `@checkout-kit/provider-psp`           | Your API exposes a Stripe-like card processor           | Card token/card confirmation and 3-D Secure 2 |
| `@checkout-kit/provider-acquiring`     | A bank acquirer uses form requests and numeric statuses | Legacy 3-D Secure 1 bank flow                 |
| `@checkout-kit/provider-hpp`           | The bank owns the payment page                          | Full-page redirect and return URL             |
| `@checkout-kit/provider-hosted-fields` | Card fields must stay on the provider origin            | Tokenized iframe fields                       |
| `@checkout-kit/provider-wallet`        | A wallet SDK owns its payment sheet                     | SDK loading and callback handoff              |
| `@checkout-kit/provider-bank-transfer` | The shopper pays in a banking app                       | QR/code display and status polling            |
| `stripe`, `adyen`, `paypal` adapters   | You use the real provider APIs                          | Provider-specific mapping behind one engine   |

The point of the library is not to hide which provider takes the money. It keeps the
application's payment loop, action rendering, cancellation, return handling and result states
the same while each provider keeps its own protocol in one adapter. The complete registration
is in [`usage.ts`](./usage.ts).

## Complete browser flow

[`scenarios.ts`](./scenarios.ts) shows the actual engine calls for every provider shape:

```ts
const checkout = createExampleCheckout({
  apiBaseUrl: '/payments-api',
  acsOrigin: 'https://acs.example.test',
  fieldsOrigin: 'https://fields.example.test',
  adyenScriptUrl: 'https://checkoutshopper-test.adyen.com/checkoutshopper/sdk/adyen.js',
})

const mount = mountAction(document.querySelector('#payment-action')!)
const result = await payWithProvider(checkout, 'adyen', mount)

if (result.status === 'requires_action') {
  window.location.assign(result.action.url)
}
```

Use the same function with `stripe`, `paypal`, `psp`, `acquiring`, `hpp`, `hostedfields`,
`wallet` or `transfer`. The scenario selects the correct instrument, runs inline SDK/QR/frame
actions, leaves full-page redirects for the return route, and normalizes the result. On that
route call `resumeFromReturnUrl(checkout)`. The same file also shows `cancelCurrentPayment`,
`readCurrentPayment` and `resetCheckout`.

The server examples use official SDKs for the providers that publish them:

The secret keys stay on the server; the browser calls your API, which returns the provider
fields consumed by the adapters. Acquiring, HPP, hosted fields, wallets and bank transfers
do not have one universal SDK: their concrete implementation belongs to the selected bank,
wallet or transfer network, so those examples intentionally use the provider URL/config
contracts instead of pretending a generic package exists.

## The one rule

Every one of these calls **your** API, never the provider's. The secret key - Stripe `sk_`,
Adyen `x-api-key`, a PayPal client secret - stays on your server. See
[The backend a plugin talks to](../../docs/backend.md).

```text
browser: plugin  →  your API  →  provider's API
```

## What each one needs from your server

### Stripe (`stripe.ts`)

| Endpoint                     | Does                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| `POST /payments`             | `paymentIntents.create` from the plan id                      |
| `POST /payments/:id/confirm` | `paymentIntents.confirm` with the card or a payment method id |
| `GET /payments/:id`          | `paymentIntents.retrieve`                                     |
| `POST /payments/:id/cancel`  | `paymentIntents.cancel`                                       |

Return Stripe's `PaymentIntent` fields as they are: `status`, `next_action`,
`last_payment_error`. The plugin reads them directly, which is less mapping and less to get
wrong. Forward the `Idempotency-Key` header to Stripe verbatim.

The plugin handles `next_action.redirect_to_url`. It refuses `use_stripe_sdk`, because that
one needs Stripe.js running in the page - a different integration, an `sdk_handoff` action
with an adapter registered by the host. See
[Integrating a real payment SDK](../../docs/integrations.md).

### Adyen (`adyen.ts`)

| Endpoint                     | Does                                        |
| ---------------------------- | ------------------------------------------- |
| `POST /payments/sessions`    | reserve an order for the plan               |
| `POST /payments/:id`         | `/payments` with the payment method         |
| `POST /payments/:id/details` | `/payments/details` with whatever came back |
| `GET /payments/:id`          | the current state                           |
| `POST /payments/:id/cancel`  | `/cancels`                                  |

Pass Adyen's `resultCode` and `action` through unchanged. The plugin branches on
`action.type`: `redirect` becomes a redirect, `threeDS2` becomes a handoff to Adyen's own
component, which the host registers as an SDK adapter:

```ts
createBrowserRuntime({
  returnPath: '/payment/return',
  sdk: {
    adapters: [
      {
        sdk: 'adyen',
        request: async (params) => {
          const checkout = await AdyenCheckout({ clientKey, environment: 'test' })
          return await new Promise((resolve, reject) => {
            checkout
              .createFromAction({ type: 'threeDS2', token: params.token, subtype: params.subtype })
              .mount('#adyen-3ds2')
              .then(resolve, reject)
          })
        },
      },
    ],
  },
})
```

`Received` and `Pending` are real outcomes for local methods and can last days. The plugin
reports `processing`; let your webhook settle it and tell the shopper by email rather than
holding the page open.

### PayPal (`paypal.ts`)

| Endpoint                          | Does                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| `POST /paypal/orders`             | create the order, return the `payer-action` link as `approveUrl` |
| `GET /paypal/orders/:id`          | the order                                                        |
| `POST /paypal/orders/:id/capture` | **capture it**                                                   |
| `POST /paypal/orders/:id/cancel`  | void it                                                          |

The trap is at the end: the shopper coming back means the order is `APPROVED`, not paid.
Money moves on capture, and capture happens on your server. The plugin calls capture from
`resume` and never reads the query string.

## Using one

```ts
import { defineProvider } from '@checkout-kit/core'
import type { StripeConfig } from './examples/providers/stripe'

createCheckout({
  providers: [
    defineProvider({
      id: 'stripe',
      config: { baseUrl: '/api' } satisfies StripeConfig,
      load: () => import('./examples/providers/stripe'),
      eager: true,
    }),
  ],
  // ...
})
```

Then run the contract suite against it before writing any UI:

```ts
describeProviderContract({
  provider: stripeProvider,
  config: { baseUrl: 'http://payments.test/api' },
  handlers: yourMswHandlers,
  instrumentFor: (testCase) => card(SCENARIO_CARDS[testCase]),
  evidenceFor: (action) => ({ via: 'return_url', actionId: action.id, params: {} }),
  declineMessage: 'Your card was declined.',
})
```

The official server SDKs installed for the real-provider examples are:

| SDK                         | Server example                                                   | Provider adapter |
| --------------------------- | ---------------------------------------------------------------- | ---------------- |
| `stripe`                    | [`stripe-payment-intent.ts`](../server/stripe-payment-intent.ts) | `./stripe`       |
| `@adyen/api-library`        | [`adyen-payment.ts`](../server/adyen-payment.ts)                 | `./adyen`        |
| `@paypal/paypal-server-sdk` | [`paypal-order.ts`](../server/paypal-order.ts)                   | `./paypal`       |
