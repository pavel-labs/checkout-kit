# Provider adapters

Stripe, Adyen and PayPal support comes as normal packages. You install them; you do not need to copy files from here into your app.

| Package                                                                     | What the shopper pays with                                   | Extra steps                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| [`@checkout-kit/provider-stripe`](../../packages/provider-stripe/README.md) | A Stripe.js PaymentMethod id                                 | A redirect, or a step inside Stripe.js                |
| [`@checkout-kit/provider-adyen`](../../packages/provider-adyen/README.md)   | Adyen component data, a saved method, or raw card if allowed | A redirect, or a step inside Adyen Web                |
| [`@checkout-kit/provider-paypal`](../../packages/provider-paypal/README.md) | Nothing — PayPal collects it                                 | Approval on PayPal's page, then capture on the server |

What the files in this folder are for:

- `stripe.ts`, `adyen.ts` and `paypal.ts` only re-export these packages, so that older example imports keep working;
- [`usage.ts`](./usage.ts) registers all nine adapters;
- [`scenarios.ts`](./scenarios.ts) shows the engine loop without any UI.

Use these files to understand registration and how steps are handled. For the exact server API of each provider, see the package README above.

The six other `provider-*` packages are protocol examples that work with the fake MSW server. They are useful when you write a plugin for your own bank, hosted fields or wallet. `provider-psp` looks like Stripe, but for the real Stripe PaymentIntent format use `provider-stripe`.

Important rules:

- every adapter calls **your API**. Secret keys and prices stay on the server;
- what comes back to the browser (callbacks, address parameters) never proves that money moved;
- with Stripe manual capture, an authorization is not a success yet;
- with PayPal, the order status and the capture status are two different things.

Every adapter passes the shared conformance test suite. More tests check the request formats, the steps and the capture logic. These tests use saved test data without any keys. They do not mean that a payment was checked against the provider's sandbox.

Start with [the runnable examples](../README.md). The sandbox server uses the official server SDKs (`stripe`, `@adyen/api-library`, `@paypal/paypal-server-sdk`) and needs your test keys. In your own server, add checked webhooks and a database for buyers and orders. See [the backend guide](../../docs/backend.md).
