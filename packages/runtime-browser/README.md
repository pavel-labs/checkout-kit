# @checkout-kit/runtime-browser

Browser support for the checkout kit engine. It contains **runners** — the code that performs extra payment steps in the browser:

- redirects (to a bank page, in an iframe or in the whole window);
- card fields from the provider (hosted fields);
- wallet and provider SDKs;
- showing a QR code or a payment code.

It also saves the payment in session storage, so it survives a redirect. The engine (`@checkout-kit/core`) decides which step is needed; this package performs it in the browser and returns what happened.

## Install from npm

```bash
npm install @checkout-kit/core @checkout-kit/runtime-browser
```

[npm package](https://www.npmjs.com/package/@checkout-kit/runtime-browser) · [Installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html#install-from-npm)

The example below uses PayPal; also install `@checkout-kit/provider-paypal`, or choose another provider from the installation guide.

```ts
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
import { createCheckout, defineProvider } from '@checkout-kit/core'

const runtime = createBrowserRuntime({ returnPath: '/checkout/payment/return' })
const engine = createCheckout({
  providers: [
    defineProvider({
      id: 'paypal',
      config: { baseUrl: '/api', credentials: 'include' },
      load: () => import('@checkout-kit/provider-paypal'),
    }),
  ],
  runners: runtime.runners,
  storage: runtime.storage,
  returnUrl: runtime.returnUrl,
  defaultProviderId: 'paypal',
})
await engine.hydrate(runtime.readReturnParams())
```

- Create the runtime in the browser, not during server-side rendering (SSR).
- If your site lives in a subfolder, include it in `returnPath`.
- Pass the same storage to the engine. If the engine uses its default in-memory storage instead, the payment cannot be restored after a redirect.

## Running steps

In React, use `PaymentActionHost`. Without React, call `engine.runPendingAction({ mount: createMount(element) })`.

- Iframes and code displays need a place on the page (a mount).
- A full-page redirect and an SDK step use the surface the step asks for.
- When a step finishes, times out or is canceled, the runner removes its elements, timers and message listeners.

```ts
const runtime = createBrowserRuntime({
  returnPath: '/checkout/return',
  sdk: {
    adapters: [
      {
        sdk: 'merchant-wallet',
        async request(params, signal) {
          // Call your wallet SDK, honor signal, and return the provider's expected payload.
          return { walletToken: 'token-returned-by-your-sdk' }
        },
      },
    ],
  },
  display: {
    text: { copy: 'Копировать', copied: 'Скопировано', copyFailed: 'Скопируйте код вручную' },
  },
})
```

**SDK scripts.** A script is loaded once per address and integrity setting. If two places ask for the same script with different integrity hashes, the load fails instead of quietly reusing an unchecked script. Waiting for an SDK always has a time limit, even if the third-party code ignores `AbortSignal`.

**Messages.** Messages from hosted fields and redirect frames are accepted only if the origin, the sender frame, the message type and the step id all match. These checks only prove where a message came from. The provider and your server still check the result. A QR code display never treats a button press as a payment: the engine asks the server.

**Storage.** If session storage is blocked, payments without a redirect still work. To restore a payment after navigation, give the engine your own `StorageAdapter` that keeps data. Storage keeps only the ids needed to continue — never card fields or SDK secrets.

[Runtime and recovery](https://pavel-labs.github.io/checkout-kit/runtime.html) · [Installation](https://pavel-labs.github.io/checkout-kit/getting-started.html)

## Safety rules for addresses

- Addresses of steps must use HTTPS.
- Provider SDK scripts load only from origins listed in `security.scriptOrigins`.
- Links to banking apps with their own scheme need `security.deeplinkProtocols`.
- Plain HTTP is allowed only for `localhost` during development, with `security.allowInsecureLocalhost: true`.
- The return address must belong to your own site.
- Where possible, import the provider's SDK as a package.

[How to configure these rules and update old code](https://pavel-labs.github.io/checkout-kit/production.html).
