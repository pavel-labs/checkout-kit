# Checkout kit

Checkout kit is a set of packages for accepting online payments. It works with Stripe, Adyen, PayPal or your own payment provider, and you write the payment flow only once.

What it does for you:

- runs the payment step by step: create the payment, send the payment details, handle extra steps (such as 3-D Secure), get the result;
- repeats a request safely if the network fails, so the shopper is not charged twice;
- restores the payment after the shopper comes back from the bank's page or reloads the tab;
- checks the real payment status with the provider instead of trusting what the browser says.

What stays with you:

- **your interface.** The engine draws nothing. Use your own components or the optional `@checkout-kit/ui` package;
- **your server.** It knows the prices, keeps the secret keys and decides whether an order is paid.

New to payments? Read the [glossary](./docs/glossary.md) first. It explains words like "intent", "instrument", "redirect" and "idempotency key".

Documentation: [English](https://pavel-labs.github.io/checkout-kit/) · [Русский](https://pavel-labs.github.io/checkout-kit/ru/). A good first page is the [package list](https://pavel-labs.github.io/checkout-kit/packages.html).

## Install in your project

All 16 `@checkout-kit/*` packages are published on [npm](https://www.npmjs.com/org/checkout-kit). Install them from your application's directory; no repository clone, registry token or custom `.npmrc` is needed. The unscoped `checkout-kit` name is not the package to install.

For a browser checkout with Stripe:

```bash
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-stripe @stripe/stripe-js
```

For React 19, add the bindings and optional UI components:

```bash
npm install @checkout-kit/react @checkout-kit/ui react@^19 react-dom@^19
```

Import `@checkout-kit/ui/styles.css` once when using the UI. For Adyen, install `@checkout-kit/provider-adyen` and `@adyen/adyen-web` instead of the Stripe packages. For PayPal, install `@checkout-kit/provider-paypal`; its redirect flow needs no browser SDK.

The [installation guide](./docs/getting-started.md#install-from-npm) includes npm, pnpm, Yarn and Bun commands, headless and React setups, WebView integration and test tools. The [package catalog](./docs/packages.md) links every package to npm and lists its published version. Package versions are independent; your lockfile records the resolved versions.

GitHub release archives and source builds remain available as alternatives; see [Releasing](./RELEASING.md). The legacy `0.2.0` archive bundle predates the current npm packages.

## Try it in two minutes

You need Node.js 24 and npm.

```bash
git clone https://github.com/pavel-labs/checkout-kit.git
cd checkout-kit
npm ci
npm run dev:integration
```

Open <http://localhost:5173> and choose **Stripe adapter**, **Adyen adapter** or **PayPal adapter**. A local test server starts on port 4000. You do not need an account or API keys: the providers are replaced by a local **simulator**.

For Stripe and Adyen, type one of these values into the payment token field:

| Value                | What happens                                |
| -------------------- | ------------------------------------------- |
| `pm_mock_approve`    | The payment succeeds.                       |
| `pm_mock_decline`    | The bank declines the payment.              |
| `pm_mock_challenge`  | The bank asks for an extra check (3DS).     |
| `pm_mock_processing` | The payment stays "processing" for a while. |

PayPal opens a test approval page. When a payment leaves the app for another page and comes back, the app restores it from session storage.

The simulator only imitates the providers. To call the real test APIs (sandbox) of Stripe, Adyen or PayPal, follow the [server guide](./examples/server/README.md).

## Packages

| Package on npm                                                                                               | What it is for                                                   |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [`@checkout-kit/core`](https://www.npmjs.com/package/@checkout-kit/core)                                     | Payment engine, types and HTTP client. No React or browser code. |
| [`@checkout-kit/runtime-browser`](https://www.npmjs.com/package/@checkout-kit/runtime-browser)               | Browser runners, storage and return-page recovery.               |
| [`@checkout-kit/react`](https://www.npmjs.com/package/@checkout-kit/react)                                   | React 19 provider, hooks and action host.                        |
| [`@checkout-kit/ui`](https://www.npmjs.com/package/@checkout-kit/ui)                                         | Optional accessible checkout components and styles.              |
| [`@checkout-kit/provider-stripe`](https://www.npmjs.com/package/@checkout-kit/provider-stripe)               | Stripe PaymentIntents and Stripe.js.                             |
| [`@checkout-kit/provider-adyen`](https://www.npmjs.com/package/@checkout-kit/provider-adyen)                 | Adyen Advanced flow, encrypted fields, 3DS2 and redirects.       |
| [`@checkout-kit/provider-paypal`](https://www.npmjs.com/package/@checkout-kit/provider-paypal)               | PayPal Orders, approval and checked capture.                     |
| [`@checkout-kit/webview-bridge`](https://www.npmjs.com/package/@checkout-kit/webview-bridge)                 | Messages between a native app and its checkout web page.         |
| [`@checkout-kit/testing`](https://www.npmjs.com/package/@checkout-kit/testing)                               | Test data, fake providers and an optional MSW backend.           |
| [`@checkout-kit/conformance`](https://www.npmjs.com/package/@checkout-kit/conformance)                       | Vitest contract suite for provider authors.                      |
| [`@checkout-kit/provider-psp`](https://www.npmjs.com/package/@checkout-kit/provider-psp)                     | Reference JSON API protocol; local simulator only.               |
| [`@checkout-kit/provider-acquiring`](https://www.npmjs.com/package/@checkout-kit/provider-acquiring)         | Reference form-based bank protocol; local simulator only.        |
| [`@checkout-kit/provider-hpp`](https://www.npmjs.com/package/@checkout-kit/provider-hpp)                     | Reference hosted payment page; local simulator only.             |
| [`@checkout-kit/provider-hosted-fields`](https://www.npmjs.com/package/@checkout-kit/provider-hosted-fields) | Reference hosted card fields; local simulator only.              |
| [`@checkout-kit/provider-wallet`](https://www.npmjs.com/package/@checkout-kit/provider-wallet)               | Reference wallet SDK protocol; local simulator only.             |
| [`@checkout-kit/provider-bank-transfer`](https://www.npmjs.com/package/@checkout-kit/provider-bank-transfer) | Reference transfer/QR protocol; local simulator only.            |

The six reference protocols are working templates for your own adapters. They do not connect to a real bank or wallet.

## When to use it

Use checkout kit when you want one payment flow for several providers, or when you need reliable retries, 3-D Secure, redirects and recovery after a page reload. You can add `observeCheckout` to collect simple metrics without sending payment data to analytics.

If you only need one provider's ready payment page, that provider's own SDK may be enough.

Before real payments, read the [production guide](./docs/production.md). It explains what checkout kit guarantees and what your server must do. A few safety rules are on by default:

- action addresses must use HTTPS;
- provider scripts load only from addresses you allow;
- raw card data for Adyen is off unless you turn it on.

These defaults and telemetry are included in the npm releases of `core@0.2.0`, `runtime-browser@0.2.0` and `provider-adyen@0.2.0`. The legacy GitHub archive bundle `0.2.0` contains older package versions.

## Connect it

First, set up the adapter routes on your server (see each provider's guide). Then create the browser runtime and the engine:

```ts
import { createCheckout, defineProvider } from '@checkout-kit/core'
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
import { createStripeSdkAdapter, type StripeConfig } from '@checkout-kit/provider-stripe'
import { loadStripe } from '@stripe/stripe-js/pure'

const stripe = loadStripe(yourPublishableKey)
const runtime = createBrowserRuntime({
  returnPath: '/payment/return',
  sdk: {
    adapters: [
      createStripeSdkAdapter(async () => {
        const client = await stripe
        if (!client) throw new Error('Stripe.js could not load.')
        return client
      }),
    ],
  },
})
const engine = createCheckout({
  providers: [
    defineProvider({
      id: 'stripe',
      config: { baseUrl: '/api/stripe', credentials: 'include' } satisfies StripeConfig,
      load: () => import('@checkout-kit/provider-stripe'),
    }),
  ],
  defaultProviderId: 'stripe',
  runners: runtime.runners,
  storage: runtime.storage,
  returnUrl: runtime.returnUrl,
})

// `paymentMethod` comes from Stripe Elements, not a raw card input.
const result = await engine.pay({
  input: { planId: '1id' },
  instrument: { kind: 'token', token: paymentMethod.id },
  idempotencyKey: orderAttemptId,
})
if (result.status === 'requires_action') await engine.runPendingAction()
// On /payment/return:
await engine.hydrate(runtime.readReturnParams())
```

What happens here:

1. `pay()` creates the payment and sends the card token. The card itself was collected by Stripe's own fields.
2. If the bank wants an extra step (`requires_action`), `runPendingAction()` runs it.
3. If that step took the shopper to another site, they come back to `/payment/return`. There `hydrate()` restores the payment and asks the server for the real result.

In React, wrap the screen in `CheckoutProvider`, read the state with `useCheckout()` and render `PaymentActionHost` where extra steps should appear. The [plain React example](./examples/react/App.tsx) shows the full screen: entering details, paying, processing, errors, receipt and return after a redirect.

Three rules that prevent double charges:

- **Keep the same idempotency key** while you repeat the same attempt, including when a reply was lost. A new key is allowed only after a clear decline.
- **If a payment is still processing, check its status first.** Do not start a second payment.
- **`reset()` only clears the page state.** It does not cancel a charge at the provider.

Each provider needs different routes on your server. The exact requests, responses and SDK callbacks are in the package READMEs: [Stripe](./packages/provider-stripe/README.md), [Adyen](./packages/provider-adyen/README.md), [PayPal](./packages/provider-paypal/README.md).

## How it is built

Every payment goes through the same steps: **create → confirm → extra step (if needed) → check the result → final status**.

- A **provider plugin** describes what the provider needs (for example, "open this bank page").
- A **runner** decides how to do it in the current app (an iframe, a full-page redirect, an SDK).

To support a new provider or a new kind of app, you add a plugin or a runner. The core does not change.

The core has no React or browser dependencies. Provider SDKs live in your app and on your server. Anything that comes back from the browser — return page parameters, SDK callbacks — is only a hint. It is checked against the server and never counts as proof of payment. Delivering the order, refunds and settlements are your server's job.

## Tests

CI checks types, unit and contract tests, browser tests of payments and UI, builds, package exports and installation outside this repository. All of this uses test data and local simulators. Checking with your own Stripe, Adyen or PayPal test account is a separate step that you do yourself.

The example server keeps orders in memory. For a real shop, replace it with a database and your own user login.

```bash
npm test
npm run test:e2e
npm run test:integration
npm run test:ui
npm run verify:consumer
```

See the [UI gallery](https://pavel-labs.github.io/checkout-kit/demo/gallery): a full checkout, light and dark themes, brand colors, mobile sizes and each component on its own.

![Checkout preview in the light theme with compact density](./docs/public/checkout-ui.jpg)

## Guides

All guides are in English and Russian. There is also a generated API reference on the site.

- Glossary: [English](./docs/glossary.md) / [Русский](./docs/ru/glossary.md)
- Getting started: [English](./docs/getting-started.md) / [Русский](./docs/ru/getting-started.md)
- Architecture: [English](./docs/architecture.md) / [Русский](./docs/ru/architecture.md)
- Writing a provider: [English](./docs/plugin-authoring.md) / [Русский](./docs/ru/plugin-authoring.md)
- Browser and SDK integration: [English](./docs/integrations.md) / [Русский](./docs/ru/integrations.md)
- UI: [English](./docs/ui.md) / [Русский](./docs/ru/ui.md)
- Payment security: [English](./docs/production.md) / [Русский](./docs/ru/production.md)
- Safe telemetry: [English](./docs/observability.md) / [Русский](./docs/ru/observability.md)
- Merchant server: [English](./docs/backend.md) / [Русский](./docs/ru/backend.md)
- Mobile apps: [English](./docs/webview.md) / [Русский](./docs/ru/webview.md)

[Documentation site](https://pavel-labs.github.io/checkout-kit/) ·
[Examples](./examples/README.md) · [Release process](./RELEASING.md)

Apache-2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
