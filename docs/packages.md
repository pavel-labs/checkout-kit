# Choose your packages

> [Русская версия](./ru/packages.md)

Checkout kit ships 16 independent ESM packages. Start with core, a provider and a host. Add browser runners for web, React bindings for React 19 and optional UI. Archives include JavaScript, declarations and exports checked in a separate consumer.

## Checkout and hosts

| Package                         | Responsibility                                                                                     | Guide                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------- |
| `@checkout-kit/core`            | Headless engine, payment vocabulary, provider registry, store, recovery and HTTP. No DOM or React. | [Architecture](./architecture.md) |
| `@checkout-kit/runtime-browser` | Redirect/iframe, hosted-field, SDK and display runners; session storage and return URL.            | [Runtime](./runtime.md)           |
| `@checkout-kit/react`           | Context, snapshot/selector hooks and action host for React 19.                                     | [React](./react.md)               |
| `@checkout-kit/ui`              | Scoped styles and composable checkout fields, states and layouts.                                  | [UI](./ui.md)                     |
| `@checkout-kit/webview-bridge`  | Typed messages, native commands, navigation and deep links. The host entry has no DOM dependency.  | [WebView](./webview.md)           |

## Named provider adapters

These integrate through your authenticated merchant API, with SDK collection examples, a runnable server, fixtures and browser tests. Verify your selected sandbox account separately.

| Package / id                 | Instrument and flow                                                                                                  | Guide                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `provider-stripe` / `stripe` | Stripe.js PaymentMethod token; PaymentIntents and SDK/redirect actions, automatic capture.                           | [Stripe](./providers/stripe.md) |
| `provider-adyen` / `adyen`   | Encrypted component data, stored token or permitted raw card; Advanced payments/details and verified merchant state. | [Adyen](./providers/adyen.md)   |
| `provider-paypal` / `paypal` | No instrument; Orders v2 approval and verified server capture.                                                       | [PayPal](./providers/paypal.md) |

Every package above uses the `@checkout-kit/` scope.

## Reference protocols

These are executable templates for your merchant protocol and the bundled simulator. A matching integration shape does not supply Apple Pay, Google Pay or a named bank automatically.

| Package / id                              | Demonstrates                              | Guide                                       |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| `provider-psp` / `psp`                    | JSON API, saved cards, 3DS2.              | [PSP](./plugins/psp.md)                     |
| `provider-acquiring` / `acquiring`        | Form API, numeric statuses, 3DS1.         | [Acquiring](./plugins/acquiring.md)         |
| `provider-hpp` / `hpp`                    | Hosted page and verified return.          | [Hosted page](./plugins/hosted-page.md)     |
| `provider-hosted-fields` / `hostedfields` | Provider-owned iframe and opaque token.   | [Hosted fields](./plugins/hosted-fields.md) |
| `provider-wallet` / `wallet`              | Registered SDK and verified wallet token. | [Wallet](./plugins/wallet.md)               |
| `provider-bank-transfer` / `transfer`     | QR/code display and polling.              | [Transfer](./plugins/bank-transfer.md)      |

## Development packages

| Package                     | Responsibility                                                                    |
| --------------------------- | --------------------------------------------------------------------------------- |
| `@checkout-kit/testing`     | Cards, fake providers/runners and MSW backend in separate entry points.           |
| `@checkout-kit/conformance` | Executable Vitest contract, including retries, replay and foreign-order evidence. |

See [testing](./testing.md). Do not use the mock backend as a payment server.

## Installation and support boundary

[Getting started](./getting-started.md#install-package-archives) installs selected archives and peers together. Bundle `0.2.0` (UI `0.2.0`; other packages `0.1.0`) is available as a [GitHub archive release](https://github.com/pavel-labs/checkout-kit/releases/tag/v0.2.0), with an installer that includes required checkout-kit peers. Current manifests target GitHub Packages; registry publication is configured separately. Build/CI archives work independently.

The library owns client orchestration. Your server owns authenticated buyers, prices, credentials, durable order state, atomic idempotent mutations, verified notifications and fulfillment. Follow [merchant integration](./merchant-integration.md).
