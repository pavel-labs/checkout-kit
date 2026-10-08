# Getting started

> Русская версия: [ru/getting-started.md](./ru/getting-started.md)

Checkout kit gives you a common payment lifecycle while the provider SDK collects the
instrument and your merchant backend verifies the outcome. You can use the headless engine
on its own, add browser runners, or build a React screen with the optional UI package.

## Run it

Clone the repository and use Node.js 24:

```bash
npm ci
npm run dev:integration
```

Open `http://localhost:5173`. Select Stripe, Adyen or PayPal. Stripe/Adyen accept
`pm_mock_approve`, `pm_mock_decline`, `pm_mock_challenge` and `pm_mock_processing`.
PayPal opens a local approval page. A redirect destroys and recreates the page; the engine
restores its pending checkout before reporting success.

This is an explicit protocol simulator. To use official sandbox APIs and provider-owned
fields, follow [the merchant server guide](../examples/server/README.md). Configure keys only
for providers you use; secrets go on the server, public client keys in the browser.

## Install the actual packages

```bash
npm run pack:packages
npm run verify:consumer
```

The first command creates `.tgz` archives in `artifacts/packages`. The second independently
packs and installs all packages in a fresh project, with strict TypeScript, Node imports,
React server rendering and a checkout flow. Successful CI runs include the archives as the
`checkout-kit-packages` artifact.

In your app, install the core, browser runtime and desired provider archives together. Add
the React and UI archives if you use them. Include peer packages in the same install command
so npm does not need to fetch unpublished checkout-kit packages from a registry.
[Releasing](../RELEASING.md) describes versioning and the configured GitHub Packages workflow.

## Connect a merchant API

| Provider | Instrument                                                        | SDK setup and exact merchant routes                     |
| -------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| Stripe   | `token`: Stripe.js PaymentMethod id                               | [Stripe package](../packages/provider-stripe/README.md) |
| Adyen    | `wallet`: Adyen component `state.data`, or a saved method `token` | [Adyen package](../packages/provider-adyen/README.md)   |
| PayPal   | `none`: approval happens on PayPal's page                         | [PayPal package](../packages/provider-paypal/README.md) |

Register a provider with `defineProvider`, its config type and a dynamic import. The browser
runtime supplies runners, session storage and the return URL. Call `engine.pay()` with a
server-recognized plan id and an instrument. Render `PaymentActionHost` in React, or call
`runPendingAction()` in a headless host with a suitable mount for visible actions.
The [React example](../examples/react/App.tsx) and [headless usage](../examples/providers/usage.ts)
show those two hosts.

## Handle attempts and recovery

- Keep the idempotency key when retrying an interrupted attempt. A lost response can hide a
  successful payment; replacing its key prematurely can create another order.
- A declined or cancelled attempt can start fresh. The engine creates a new intent rather
  than reusing the exhausted one.
- A processing timeout is unresolved. A further `pay()` reconciles the existing intent by
  polling before creating another payment.
- Call `hydrate(runtime.readReturnParams())` on the return route. Keep that route and its
  parameters available during a temporary API outage, then retry recovery.
- `reset()` abandons local state. Use `abort()` to request cancellation; the provider may
  already have accepted the payment. Always use its authoritative status.
- Fulfill orders from verified merchant state, including webhook or server reconciliation
  when a shopper closes the browser.

The example server checks prices, session ownership, scoped idempotency keys and Adyen HMAC
notifications. Its in-memory store and demo session cookie are deliberately replaceable with
an application's database and authenticated buyer.

## Verify your integration

`npm test` covers the engine, HTTP boundary and plugin conformance. `npm run test:e2e` runs the
six generic protocol integrations. `npm run test:integration` covers the three provider packages
through the merchant server, including declines, polling, redirect recovery and capture.
CI also checks exports and separate-consumer installation.

Fixtures and simulators validate the code paths without account credentials. Run the selected
provider's sandbox with your own account, webhook settings and SDK configuration before enabling
payments for users.
