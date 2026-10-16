# Choose your packages

> [Русская версия](./ru/packages.md)

Checkout kit is split into 16 separate packages, so you install only what you need. A typical web app needs:

- `core` — the payment engine (always needed);
- one provider package, for example `provider-stripe`;
- `runtime-browser` — so the engine can work in a browser;
- `react` — if your app uses React 19;
- `ui` — if you want ready-made components (optional).

Each archive contains JavaScript (ESM), TypeScript types and exports. All of them are checked by installing them into a separate clean project.

## Checkout and hosts

| Package                         | What it does                                                                                                                                | Guide                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `@checkout-kit/core`            | The payment engine: payment types, the list of providers, state, recovery and an HTTP client. No browser code, no React.                    | [Architecture](./architecture.md) |
| `@checkout-kit/runtime-browser` | Runs the extra steps in a browser: redirects and iframes, hosted fields, provider SDKs, QR codes. Also session storage and the return page. | [Runtime](./runtime.md)           |
| `@checkout-kit/react`           | React 19 bindings: a context provider, hooks to read state, and a component that shows extra steps.                                         | [React](./react.md)               |
| `@checkout-kit/ui`              | Ready checkout components (fields, states, layouts) with styles that do not leak into the rest of your page.                                | [UI](./ui.md)                     |
| `@checkout-kit/webview-bridge`  | For mobile apps: typed messages, commands from the app, navigation and deep links. The app side does not need a browser.                    | [WebView](./webview.md)           |

## Named provider adapters

These three packages work with real providers. Your browser talks to **your** server, and your server talks to the provider. Each comes with an example of collecting card details with the provider's SDK, a working server, test data and browser tests. You still need to check it with your own sandbox account.

| Package / id                 | What the shopper pays with, and how the payment goes                                                                                                | Guide                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `provider-stripe` / `stripe` | A PaymentMethod token from Stripe.js. Uses PaymentIntents, SDK steps and redirects. Money is captured automatically.                                | [Stripe](./providers/stripe.md) |
| `provider-adyen` / `adyen`   | Encrypted data from the Adyen component, a saved card token, or raw card data if you allow it. Uses the Advanced flow; the server checks the state. | [Adyen](./providers/adyen.md)   |
| `provider-paypal` / `paypal` | Nothing is collected on your page. The shopper approves on PayPal (Orders v2), then your server captures and checks the payment.                    | [PayPal](./providers/paypal.md) |

All package names start with `@checkout-kit/`.

## Reference protocols

These packages are **working templates** for common kinds of payment APIs. They talk only to the included simulator. Use them as a starting point for your own provider. They do not give you Apple Pay, Google Pay or any real bank by themselves, even if the protocol looks the same.

| Package / id                              | Shows how to work with                                         | Guide                                       |
| ----------------------------------------- | -------------------------------------------------------------- | ------------------------------------------- |
| `provider-psp` / `psp`                    | A JSON API, saved cards, 3DS2.                                 | [PSP](./plugins/psp.md)                     |
| `provider-acquiring` / `acquiring`        | A bank API with HTML forms, numeric statuses, 3DS1.            | [Acquiring](./plugins/acquiring.md)         |
| `provider-hpp` / `hpp`                    | A payment page on the provider's site, and a checked return.   | [Hosted page](./plugins/hosted-page.md)     |
| `provider-hosted-fields` / `hostedfields` | Card fields in the provider's iframe that return a token.      | [Hosted fields](./plugins/hosted-fields.md) |
| `provider-wallet` / `wallet`              | A wallet SDK and a checked wallet token.                       | [Wallet](./plugins/wallet.md)               |
| `provider-bank-transfer` / `transfer`     | Showing a QR code or a payment code and waiting for the money. | [Transfer](./plugins/bank-transfer.md)      |

## Development packages

| Package                     | What it does                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `@checkout-kit/testing`     | Test cards, fake providers and runners, and a fake payment server (MSW). Each is a separate import.               |
| `@checkout-kit/conformance` | A ready Vitest test suite for provider plugins. It checks retries, repeated requests and data from another order. |

See [testing](./testing.md). Never use the fake payment server as a real payment server.

## Installation and responsibilities {#installation-and-support-boundary}

[Getting started](./getting-started.md#install-package-archives) shows how to install the archives you need together with their dependencies. Bundle `0.2.0` (UI is `0.2.0`, other packages are `0.1.0`) is on [GitHub Releases](https://github.com/pavel-labs/checkout-kit/releases/tag/v0.2.0), with an installer that adds the required checkout-kit packages. The current package settings point to GitHub Packages; publishing to a registry is configured separately. Archives built locally or in CI work on their own.

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
