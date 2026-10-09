# @checkout-kit/runtime-browser

Browser runners for redirect, hosted fields, wallet SDK and display actions, plus session-storage persistence. Core decides which action is pending; the runtime executes its browser behavior and returns evidence.

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

Create this runtime in the browser, not during SSR. `returnPath` includes your deployment's base path. Pass the same storage adapter to the engine; redirect recovery cannot work if the engine uses a fresh in-memory store instead.

## Running actions

React hosts use `PaymentActionHost`. Other hosts call `engine.runPendingAction({ mount: createMount(element) })`. Iframes and displays need a mount; top-level navigation and SDK handoff use their declared surfaces. The runners remove their DOM, timers and message listeners when the action finishes, times out or is aborted.

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

SDKs are loaded once per URL and integrity setting. Requests with conflicting integrity settings fail instead of silently reusing an unpinned script. SDK waits are bounded even when the third party ignores `AbortSignal`.

Hosted-field and redirect messages must match the expected origin, frame sender, message type and action id. These checks establish provenance; the provider and merchant server still verify the outcome. A QR display never treats a button press as payment: the engine polls the backend.

If session storage is blocked, direct flows can still run; navigation recovery needs a durable host-supplied `StorageAdapter`. Storage contains only resumable metadata, not card fields or SDK payment secrets.

[Runtime and recovery](https://pavel-labs.github.io/checkout-kit/runtime.html) · [Installation](https://pavel-labs.github.io/checkout-kit/getting-started.html)

## URL security defaults

Action URLs require HTTPS. Dynamic SDK scripts require explicit `security.scriptOrigins`;
custom bank app links require `security.deeplinkProtocols`. HTTP is limited to loopback
with `security.allowInsecureLocalhost: true` for local development. Return URLs must belong
to the application origin. Import provider SDKs directly where possible.

[Configure the policy and migration](https://pavel-labs.github.io/checkout-kit/production.html).
