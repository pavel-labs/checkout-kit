# Provider adapters

Stripe, Adyen and PayPal are public package entry points in this repository, not files you
need to copy into your application:

| Package                                                                     | Instrument                                                 | Actions                                |
| --------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| [`@checkout-kit/provider-stripe`](../../packages/provider-stripe/README.md) | Stripe.js PaymentMethod id                                 | Redirect or Stripe.js handoff          |
| [`@checkout-kit/provider-adyen`](../../packages/provider-adyen/README.md)   | Adyen component data, stored method, or permitted raw card | Redirect or Adyen Web handoff          |
| [`@checkout-kit/provider-paypal`](../../packages/provider-paypal/README.md) | None; PayPal collects it                                   | Approval redirect, then server capture |

`stripe.ts`, `adyen.ts` and `paypal.ts` re-export these packages to keep older example imports
working. [`usage.ts`](./usage.ts) registers all nine adapters; [`scenarios.ts`](./scenarios.ts)
shows the headless engine loop. Use those files to understand registration and action
handling. For the provider's exact merchant API contract, use the package README above.

The six original `provider-*` packages are protocol examples over the MSW backend. They
remain useful when implementing a bank, hosted fields or a wallet plugin of your own.
`provider-psp` is Stripe-shaped; use `provider-stripe` for Stripe's actual PaymentIntent format.

All adapters call **your API**. Secret keys and prices stay on the server. Browser callbacks
and query strings never establish that money moved. Stripe's manual-capture authorization is
not success, and PayPal's order status is separate from its capture status.

Every packaged adapter passes the shared conformance suite. Additional tests cover wire
formats, action handoff and capture semantics. These are credential-free fixtures and do not
claim that a payment has been verified against a provider's sandbox.

Start with [the runnable examples](../README.md). The sandbox server uses the official server
SDKs (`stripe`, `@adyen/api-library`, `@paypal/paypal-server-sdk`) and must be configured with
your test credentials. Add verified webhooks and durable buyer/order storage in your merchant
backend. See [the backend guide](../../docs/backend.md).
