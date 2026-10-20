# Getting started

> [Русская версия](./ru/getting-started.md)

Install the packages from npm, connect your app, then test against a simulator or your own Stripe, Adyen or PayPal sandbox account. You can also run the complete local example without any keys.

How the work is split: the engine runs the payment steps, retries and recovery. The provider's SDK collects the card details. Your server checks whether the payment really went through. If a word is unfamiliar, see the [glossary](./glossary.md).

<span id="install-package-archives"></span>

## Install from npm {#install-from-npm}

All 16 packages are public on [npm](https://www.npmjs.com/org/checkout-kit). Run these commands in **your application's folder**. You do not need to clone checkout-kit, download archives, sign in to npm or configure a private registry. Use the full `@checkout-kit/*` names, not the unscoped `checkout-kit` name.

### Browser checkout without React

For PayPal, install the engine, browser runtime and provider:

```sh
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal
```

The same packages can be installed with pnpm, Yarn or Bun:

```sh
pnpm add @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal
yarn add @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal
bun add @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal
```

Choose **one** command for your package manager. All packages ship ESM JavaScript and TypeScript declarations. No build of the library is needed in your app. A provider still needs [routes on your server](./merchant-integration.md).

### React 19 and optional UI

For the complete [React example](./react.md#complete-example), including PayPal and the UI kit:

```sh
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal @checkout-kit/react @checkout-kit/ui react@^19 react-dom@^19
```

Keep React and React DOM on matching versions. If your app already uses compatible React 19 versions, keep them. Leave out `@checkout-kit/ui` when using your own design system, and leave out both React packages and their peers for a headless checkout.

Import the stylesheet once when using UI components:

```ts
import '@checkout-kit/ui/styles.css'
```

### Stripe, Adyen or PayPal

Use the command for your provider instead of the PayPal command above. Add the React/UI packages separately if needed.

```sh
# Stripe: includes Stripe.js for collecting a PaymentMethod and handling SDK steps.
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-stripe @stripe/stripe-js

# Adyen: includes the browser SDK for encrypted fields and 3DS2.
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-adyen @adyen/adyen-web

# PayPal: approval uses a redirect; no browser SDK is needed.
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal
```

If using Stripe's React Elements wrappers, also install `@stripe/react-stripe-js`. Configure the provider's **server** SDK separately; never put a secret key in the browser. Follow the [Stripe](./providers/stripe.md), [Adyen](./providers/adyen.md) or [PayPal](./providers/paypal.md) guide.

### Mobile WebView bridge

In **both** the web checkout and native host projects:

```sh
npm install @checkout-kit/core @checkout-kit/webview-bridge
```

Native code imports `@checkout-kit/webview-bridge/host` and `/protocol`; the checkout web page imports the root entry. Install your native WebView component in the host app separately (for Expo: `npx expo install react-native-webview`). See [WebView](./webview.md).

### Testing and provider conformance

Test data and fake providers need only core and testing:

```sh
npm install @checkout-kit/core
npm install --save-dev @checkout-kit/testing
```

For `@checkout-kit/testing/backend`, add the optional peer `msw@^2.15.0`. To run the provider contract suite, install all its peers:

```sh
npm install @checkout-kit/core
npm install --save-dev @checkout-kit/testing @checkout-kit/conformance msw@^2.15.0 vitest@^5.0.0
```

Keep core as a runtime dependency; the test tools belong in development dependencies. These tools simulate payments; see [testing](./testing.md).

### Reference protocols

These six published packages are **simulator-backed templates**, not real bank integrations. Choose the one you are exploring:

```sh
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-psp
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-acquiring
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-hpp
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-hosted-fields
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-wallet
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-bank-transfer
```

The [package catalog](./packages.md) links all 16 packages to npm and explains which ones to choose. Imports such as `@checkout-kit/core/engine`, `@checkout-kit/testing/backend` and `@checkout-kit/ui/styles.css` are **entry points of their parent package**, not separate packages to install.

### Archives or source builds

For a fixed GitHub archive bundle, follow [Releasing](../RELEASING.md#install-a-tagged-release). To build the current source in a repository clone:

```sh
npm ci
npm run pack:packages
# From your application's directory:
node /path/to/checkout-kit/artifacts/packages/install.mjs runtime-browser provider-paypal react ui
```

CI also saves these archives as `checkout-kit-packages`. They are an alternative to npm. The legacy GitHub bundle `0.2.0` contains UI `0.2.0` and the other packages at `0.1.0`; its bundle version is not the version of every npm package.

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

## Package versions and updates {#public-npm-release-preparation}

The packages are published under `latest`; ordinary install commands use that tag. Package versions are independent: `core`, `runtime-browser` and `provider-adyen` are `0.2.0`, UI is `0.2.1`, and the other packages are `0.1.1`. Check a package with `npm view @checkout-kit/core version` or follow its npm link in the [catalog](./packages.md).

Commit your application's lockfile. To move from archive dependencies (`file:...tgz`) to npm, rerun the relevant install command above with the full package names and check the changes to `package.json` and your lockfile. Review package changelogs and [migration notes](./production.md#a-safe-browser-configuration) when updating from older versions. [Releasing](../RELEASING.md#public-npm-publication) is for maintainers publishing future versions.
