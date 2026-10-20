# Choose your packages

> [Русская версия](./ru/packages.md)

Checkout kit is split into 16 separate packages, so you install only what you need. A typical web app needs:

- `core` — the payment engine (always needed);
- one provider package, for example `provider-stripe`;
- `runtime-browser` — so the engine can work in a browser;
- `react` — if your app uses React 19;
- `ui` — if you want ready-made components (optional).

All 16 packages are published on the public npm registry. Each contains JavaScript (ESM), TypeScript types and exports, checked by installation into a separate clean project. Versions are independent; the tables below list the published versions. Use `npm view @checkout-kit/core version` (or another package name) to check the current `latest` version.

## Checkout and hosts

| Package                                                                                        | Version | What it does                                                                                                                                | Guide                             |
| ---------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| [`@checkout-kit/core`](https://www.npmjs.com/package/@checkout-kit/core)                       | `0.2.0` | The payment engine: payment types, the list of providers, state, recovery and an HTTP client. No browser code, no React.                    | [Architecture](./architecture.md) |
| [`@checkout-kit/runtime-browser`](https://www.npmjs.com/package/@checkout-kit/runtime-browser) | `0.2.0` | Runs the extra steps in a browser: redirects and iframes, hosted fields, provider SDKs, QR codes. Also session storage and the return page. | [Runtime](./runtime.md)           |
| [`@checkout-kit/react`](https://www.npmjs.com/package/@checkout-kit/react)                     | `0.1.1` | React 19 bindings: a context provider, hooks to read state, and a component that shows extra steps.                                         | [React](./react.md)               |
| [`@checkout-kit/ui`](https://www.npmjs.com/package/@checkout-kit/ui)                           | `0.2.1` | Ready checkout components (fields, states, layouts) with styles that do not leak into the rest of your page.                                | [UI](./ui.md)                     |
| [`@checkout-kit/webview-bridge`](https://www.npmjs.com/package/@checkout-kit/webview-bridge)   | `0.1.1` | For mobile apps: typed messages, commands from the app, navigation and deep links. The app side does not need a browser.                    | [WebView](./webview.md)           |

## Named provider adapters

These three packages work with real providers. Your browser talks to **your** server, and your server talks to the provider. Each comes with an example of collecting card details with the provider's SDK, a working server, test data and browser tests. You still need to check it with your own sandbox account.

| Package / id                                                                                              | Version | What the shopper pays with, and how the payment goes                                                                                                | Guide                           |
| --------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| [`@checkout-kit/provider-stripe`](https://www.npmjs.com/package/@checkout-kit/provider-stripe) / `stripe` | `0.1.1` | A PaymentMethod token from Stripe.js. Uses PaymentIntents, SDK steps and redirects. Money is captured automatically.                                | [Stripe](./providers/stripe.md) |
| [`@checkout-kit/provider-adyen`](https://www.npmjs.com/package/@checkout-kit/provider-adyen) / `adyen`    | `0.2.0` | Encrypted data from the Adyen component, a saved card token, or raw card data if you allow it. Uses the Advanced flow; the server checks the state. | [Adyen](./providers/adyen.md)   |
| [`@checkout-kit/provider-paypal`](https://www.npmjs.com/package/@checkout-kit/provider-paypal) / `paypal` | `0.1.1` | Nothing is collected on your page. The shopper approves on PayPal (Orders v2), then your server captures and checks the payment.                    | [PayPal](./providers/paypal.md) |

All package names start with `@checkout-kit/`.

## Reference protocols

These packages are **working templates** for common kinds of payment APIs. They talk only to the included simulator. Use them as a starting point for your own provider. They do not give you Apple Pay, Google Pay or any real bank by themselves, even if the protocol looks the same.

| Package / id                                                                                                                  | Version | Shows how to work with                                         | Guide                                       |
| ----------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------- | ------------------------------------------- |
| [`@checkout-kit/provider-psp`](https://www.npmjs.com/package/@checkout-kit/provider-psp) / `psp`                              | `0.1.1` | A JSON API, saved cards, 3DS2.                                 | [PSP](./plugins/psp.md)                     |
| [`@checkout-kit/provider-acquiring`](https://www.npmjs.com/package/@checkout-kit/provider-acquiring) / `acquiring`            | `0.1.1` | A bank API with HTML forms, numeric statuses, 3DS1.            | [Acquiring](./plugins/acquiring.md)         |
| [`@checkout-kit/provider-hpp`](https://www.npmjs.com/package/@checkout-kit/provider-hpp) / `hpp`                              | `0.1.1` | A payment page on the provider's site, and a checked return.   | [Hosted page](./plugins/hosted-page.md)     |
| [`@checkout-kit/provider-hosted-fields`](https://www.npmjs.com/package/@checkout-kit/provider-hosted-fields) / `hostedfields` | `0.1.1` | Card fields in the provider's iframe that return a token.      | [Hosted fields](./plugins/hosted-fields.md) |
| [`@checkout-kit/provider-wallet`](https://www.npmjs.com/package/@checkout-kit/provider-wallet) / `wallet`                     | `0.1.1` | A wallet SDK and a checked wallet token.                       | [Wallet](./plugins/wallet.md)               |
| [`@checkout-kit/provider-bank-transfer`](https://www.npmjs.com/package/@checkout-kit/provider-bank-transfer) / `transfer`     | `0.1.1` | Showing a QR code or a payment code and waiting for the money. | [Transfer](./plugins/bank-transfer.md)      |

## Development packages

| Package                                                                                | Version | What it does                                                                                                      |
| -------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| [`@checkout-kit/testing`](https://www.npmjs.com/package/@checkout-kit/testing)         | `0.1.1` | Test cards, fake providers and runners, and a fake payment server (MSW). Each is a separate import.               |
| [`@checkout-kit/conformance`](https://www.npmjs.com/package/@checkout-kit/conformance) | `0.1.1` | A ready Vitest test suite for provider plugins. It checks retries, repeated requests and data from another order. |

See [testing](./testing.md). Never use the fake payment server as a real payment server.

## Installation and responsibilities {#installation-and-support-boundary}

[Getting started](./getting-started.md#install-from-npm) has copyable commands for each setup, including every reference protocol and both development packages. Install the scoped names above from npm; no GitHub Packages authentication or archive installer is needed. GitHub archives remain an alternative for fixed legacy bundles and source builds.

**The library** runs the payment in the client: steps, retries, recovery.

**Your server** is responsible for:

- logging in the buyer;
- prices;
- secret keys;
- saving orders in a database;
- making sure each operation runs only once (idempotency), even with parallel requests;
- checking provider notifications (webhooks);
- delivering the order.

Read [merchant server](./merchant-integration.md) for details.
