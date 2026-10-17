# Getting started

> [Русская версия](./ru/getting-started.md)

This page has three parts:

1. Run a ready example on your computer. No accounts or keys are needed.
2. Install the packages into your own project.
3. Connect a real test account (sandbox) of Stripe, Adyen or PayPal.

How the work is split: the engine runs the payment steps, retries and recovery. The provider's SDK collects the card details. Your server checks whether the payment really went through. If a word is unfamiliar, see the [glossary](./glossary.md).

## Run the example on your computer {#run-a-complete-local-flow}

You need Node.js 24 and npm:

```sh
git clone https://github.com/pavel-labs/checkout-kit.git
cd checkout-kit
npm ci
npm run dev:integration
```

Open `http://localhost:5173`. The command starts a React page and a test server. Instead of the real providers, a **local simulator** answers, so no keys are needed. Choose Stripe, Adyen or PayPal. The price is set by the server from `planId`, not by the browser.

Try different outcomes:

| What to test                       | Stripe / Adyen: type this value | PayPal                                      |
| ---------------------------------- | ------------------------------- | ------------------------------------------- |
| Successful payment                 | `pm_mock_approve`               | Approve on the test page.                   |
| Declined payment                   | `pm_mock_decline`               | Decline on the test page.                   |
| Extra check by the bank / redirect | `pm_mock_challenge`             | Approval opens another page and comes back. |
| Payment still processing           | `pm_mock_processing`            | Covered by automated tests only.            |

To see recovery in action, reload the page while you are on the return page. The data that came back in the address only says that the shopper went through the step. The real result still comes from the server. The `pm_mock_*` values work only with the simulator.

There are two demos:

- the [site demo](/demo/) shows six example protocols. Its fake server runs right in the browser (MSW);
- the local example above shows the three real adapters (Stripe, Adyen, PayPal) with a real HTTP server.

[Testing](./testing.md) describes both.

## Install the packages {#install-package-archives}

1. Download `checkout-kit-0.2.0.tar.gz` from [the GitHub release](https://github.com/pavel-labs/checkout-kit/releases/tag/v0.2.0) and unpack it. Inside are all 16 packages, a list of file hashes, checksums and an installer. You do not need to clone the repository or get a registry token.
2. Go to **your application's folder** and run the installer with the packages you need:

```sh
node /path/to/checkout-kit-0.2.0/install.mjs runtime-browser provider-paypal react ui
```

The installer checks every archive. It also adds the other checkout-kit packages they depend on, including `core`. Other dependencies, such as React 19, are installed by npm as usual. Your app's `react-dom` must match your React version. For Stripe or Adyen, write `provider-stripe` or `provider-adyen` instead of `provider-paypal`.

```sh
# Show the available packages, or check your choice without installing:
node /path/to/checkout-kit-0.2.0/install.mjs --list
node /path/to/checkout-kit-0.2.0/install.mjs provider-paypal react ui --dry-run
```

If your app does not use React, choose only `runtime-browser` and a provider. You can also install single `.tgz` files with `npm install`, but then list their checkout-kit dependencies in the same command.

About versions: bundle **0.2.0** contains `@checkout-kit/ui@0.2.0`, and the other 15 packages are `0.1.0`. Each package has its own version. The installer reads the manifest and picks the right archives.

### Build the packages yourself

You can build archives from the current source:

```sh
npm run pack:packages
# From your application's directory:
node /path/to/checkout-kit/artifacts/packages/install.mjs runtime-browser provider-paypal react ui
```

Every successful [CI run](https://github.com/pavel-labs/checkout-kit/actions/workflows/ci.yml) also saves these archives as `checkout-kit-packages`. CI files are deleted after a while, but files attached to a release stay. Publishing to a package registry is set up separately.

The packages are ESM modules with TypeScript types. [The package list](./packages.md) describes all 16. [Releasing](../RELEASING.md) explains versions, release archives and registry setup.

## Connect your app {#connect-your-app}

Copy the two files from [the React guide](./react.md#complete-example). Then, in the file where your app starts, restore any unfinished payment and render the screen:

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

Rules:

- create **one** engine for one checkout;
- the return page (`/payment/return`) must open the same app;
- `baseUrl` is the address of your server API, and the user must be logged in there.

What each provider expects as the payment instrument:

| Provider | What to pass                                                                | Setup                           |
| -------- | --------------------------------------------------------------------------- | ------------------------------- |
| Stripe   | The PaymentMethod id from Stripe.js, as a `token`.                          | [Stripe](./providers/stripe.md) |
| Adyen    | `state.data` from the Adyen component as a `wallet`, or a saved card token. | [Adyen](./providers/adyen.md)   |
| PayPal   | `{ kind: 'none' }`. The shopper approves the payment on PayPal's page.      | [PayPal](./providers/paypal.md) |

## Connect a real test account {#use-official-sandbox-apis}

```sh
cp examples/server/.env.example examples/server/.env
cp examples/react/.env.example examples/react/.env
# Fill the selected provider's test keys before starting.
npm run dev:server -w @checkout-kit/examples
# In a second terminal:
npm run dev:react -w @checkout-kit/examples
```

- Open the app and the API on the **same host name** (for example, both on `localhost`). Otherwise the login cookie will not work.
- Keys in the browser `.env` are public keys. Keys in the server `.env` are secrets; never put them in the browser.
- If a provider has no keys, it is simply turned off.

[Merchant server](./merchant-integration.md) lists all settings, routes, login and what must be stored in a database.

## What to read next {#continue-your-integration}

- [React](./react.md): how long the engine lives, hooks, extra steps.
- [Browser runtime and recovery](./runtime.md): redirects, retries, status checks, cancel.
- [Testing](./testing.md): test data, browser scenarios, install check in a clean project.
- [Troubleshooting](./troubleshooting.md): common problems and fixes.

`npm run verify:consumer` builds the packages, installs them into a fresh project and checks exports, strict types, a payment run in Node and server-side rendering in React. Tests and the simulator check the code. Only your own sandbox account can check that provider's SDK, notifications and return settings.

## Public npm release {#public-npm-release-preparation}

The source is prepared for publishing to the public npm registry, but the packages are not available there yet. Until then, use the archives or the source. [Releasing](../RELEASING.md#public-npm-publication) covers the dry run, scope ownership and OIDC. Before real payments, read the [production guide](./production.md). The new safety defaults are not in the older 0.2.0 bundle.
