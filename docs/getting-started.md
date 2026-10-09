# Getting started

> [Русская версия](./ru/getting-started.md)

Run a complete flow, then connect the same client to your merchant API. The headless engine handles attempts, actions and recovery; SDKs collect the instrument and your server verifies payment.

## Run a complete local flow

Use Node.js 24 and npm:

```sh
git clone https://github.com/pavel-labs/checkout-kit.git
cd checkout-kit
npm ci
npm run dev:integration
```

Open `http://localhost:5173`. The command starts React and the HTTP merchant server in explicit **local simulator** mode, without account keys. Select Stripe, Adyen or PayPal. The server determines price from `planId`.

| Scenario                  | Stripe / Adyen mock instrument | PayPal                                    |
| ------------------------- | ------------------------------ | ----------------------------------------- |
| Paid                      | `pm_mock_approve`              | Approve on the local page.                |
| Declined                  | `pm_mock_decline`              | Decline on the local page.                |
| Authentication / redirect | `pm_mock_challenge`            | Approval leaves the checkout and returns. |
| Processing                | `pm_mock_processing`           | Pending capture is tested by fixtures.    |

Refresh on the return route to exercise recovery. A callback supplies evidence; the merchant API still determines the result. Mock identifiers only belong to this mode.

The [site demo](/demo/) exercises six reference protocols with an in-browser MSW backend. The local integration above exercises three named adapters with an HTTP server. [Testing](./testing.md) describes both.

## Install package archives

Until a registry version is published, build archives or download `checkout-kit-packages` from a successful [CI run](https://github.com/pavel-labs/checkout-kit/actions/workflows/ci.yml):

```sh
npm run pack:packages
```

Archives and an integrity manifest appear in `artifacts/packages`. Install selected packages and their peers together in your React app; replace the archive location/version:

```sh
npm install \
  ../checkout-kit/artifacts/packages/checkout-kit-core-0.0.0.tgz \
  ../checkout-kit/artifacts/packages/checkout-kit-runtime-browser-0.0.0.tgz \
  ../checkout-kit/artifacts/packages/checkout-kit-provider-paypal-0.0.0.tgz \
  ../checkout-kit/artifacts/packages/checkout-kit-react-0.0.0.tgz \
  ../checkout-kit/artifacts/packages/checkout-kit-ui-0.0.0.tgz \
  react@^19 react-dom@^19
```

The packages are ESM with declarations. [The catalog](./packages.md) covers all 16. A host without React needs core, runtime and its provider. See [Releasing](../RELEASING.md) for registry setup and versioning.

## Connect your app

Copy the two checked modules from [the React guide](./react.md#complete-example), then hydrate at the browser composition root:

```tsx
import { createRoot } from 'react-dom/client'
import { createPayPalCheckout } from './quickstart-engine'
import { PayPalCheckout } from './quickstart'

const { engine, runtime, pay } = createPayPalCheckout('http://localhost:4000', '/payment/return')
await engine.hydrate(runtime.readReturnParams())
const root = document.getElementById('root')
if (!root) throw new Error('Missing checkout root')
createRoot(root).render(<PayPalCheckout engine={engine} planId="1id" pay={pay} />)
```

Create one engine per checkout. Serve the same app on its return route. `baseUrl` points at your authenticated merchant API.

| Provider | Instrument                                                            | Setup                           |
| -------- | --------------------------------------------------------------------- | ------------------------------- |
| Stripe   | Stripe.js PaymentMethod id as a `token`.                              | [Stripe](./providers/stripe.md) |
| Adyen    | Component `state.data` as an Adyen `wallet` or a stored method token. | [Adyen](./providers/adyen.md)   |
| PayPal   | `{ kind: 'none' }`; approval on its page.                             | [PayPal](./providers/paypal.md) |

## Use official sandbox APIs

```sh
cp examples/server/.env.example examples/server/.env
cp examples/react/.env.example examples/react/.env
# Fill the selected provider's test keys before starting.
npm run dev:server -w @checkout-kit/examples
# In a second terminal:
npm run dev:react -w @checkout-kit/examples
```

Use the same hostname for app and API. Browser variables are public keys; server variables are secrets. Missing keys disable that provider. [Merchant integration](./merchant-integration.md) lists settings, routes, authentication and durable-state responsibilities.

## Continue your integration

- [React](./react.md): engine lifetime, hooks and actions.
- [Runtime and recovery](./runtime.md): redirects, retries, polling and cancellation.
- [Testing](./testing.md): fixtures, browser scenarios and isolated installation.
- [Troubleshooting](./troubleshooting.md): concrete causes and fixes.

`npm run verify:consumer` builds, packs and installs the library in a fresh project, checking exports, strict types, Node checkout and React SSR. Tests and simulators validate code paths; your account's sandbox validates its SDK, notifications and return configuration.
