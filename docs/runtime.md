# Browser runtime and recovery

> [Русская версия](./ru/runtime.md)

`@checkout-kit/runtime-browser` runs the extra steps (actions) of a payment in the browser: opening the bank page, showing a QR code, starting a provider SDK.

Who does what:

- the **engine** keeps track of the payment attempt;
- the **runners** from this package perform the steps and bring back what happened;
- the **provider and your server** decide whether the payment really succeeded.

## Set it up once {#wire-the-browser-once}

```ts
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
const runtime = createBrowserRuntime({ returnPath: '/checkout/payment/return' })
// Give createCheckout runtime.runners, runtime.storage and runtime.returnUrl.
```

- `returnPath` is the page where the shopper comes back after a redirect. If your site lives in a subfolder, include it. The path is added to the current site address.
- Always pass `runtime.storage` to the engine. The engine's default storage lives in memory and disappears when the browser opens another page.

Which steps are supported, and what you need for each:

| Action           | What happens                                                                                           | What your page needs                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `redirect`       | Opens an address (GET or POST) in an iframe or in the whole window. Keeps the address and form fields. | For an iframe: a place to show it. For the whole window: a working return page. |
| `collect_fields` | The provider's iframe collects the card details and sends back a token (via `postMessage`).            | A place to show it, and the exact origin of the iframe.                         |
| `sdk_handoff`    | Calls a registered SDK adapter. It can also load the SDK script.                                       | An adapter whose name matches `action.sdk`.                                     |
| `display`        | Shows a QR code, a payment code or instructions while the engine checks the status.                    | A place to show it. Optionally, a QR image URL from the provider.               |

Without React, create the place yourself with `createMount(element)` and pass it to `engine.runPendingAction({ mount })`. In React, use `PaymentActionHost`. There is no ready runner for popup windows; if you need one, register your own.

## Provider SDKs {#sdk-lifecycle}

```ts
const runtime = createBrowserRuntime({
  returnPath: '/checkout/return',
  sdk: {
    adapters: [
      {
        sdk: 'merchant-wallet',
        async request(params, signal) {
          return walletSdk.requestPayment(params, { signal })
        },
      },
    ],
  },
})
```

You write `walletSdk` yourself. Return the result **after the SDK has finished** — not when its component appears on the screen. [Stripe](./providers/stripe.md) comes with a ready SDK adapter. For [Adyen](./providers/adyen.md), the adapter returns the extra details the provider asks for.

If two places load the same script address, it is loaded once. If they ask for different integrity hashes, the load is rejected. The runner stops waiting after a deadline or when the payment is canceled. On cancel, your code should also close the SDK's window.

## Restore after a redirect {#restore-a-redirect}

On the return page, set up the engine the same way (same providers, same storage) and call:

```ts
const result = await engine.hydrate(runtime.readReturnParams())
```

What `hydrate` does:

1. Reads the saved provider, payment id and step id.
2. Asks the provider for the real order status.
3. If the payment is already final, nothing else is sent — no second confirmation, no second capture.

The data from the address is accepted only if it belongs to the saved step. If the server is temporarily unavailable, the saved data is kept: call `hydrate` again later with the same parameters.

Requirements:

- your app must open at exactly the return address;
- keep the address parameters and the same session storage until recovery is finished;
- if the shopper comes back in a different tab or in the phone's system browser, the saved data is not there, so your app has to handle recovery itself.

## Attempts, retries and cancel {#attempts-retries-and-cancellation}

| Situation                                 | What to do                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| No reply when creating or confirming      | Repeat the same attempt with the same key. The engine finds the payment that already exists.      |
| The payment is processing                 | Keep checking the same payment. If time runs out, the result stays unknown — do not charge again. |
| The provider clearly declined or canceled | The next try may create a new payment with a new key.                                             |
| Start over                                | `reset()` clears the page state. It does **not** cancel a charge on the server.                   |
| The shopper cancels                       | `abort()` stops the work and asks the provider to cancel, if the provider supports it.            |
| The payment succeeded while canceling     | Keep "succeeded". The interface cannot undo a real payment.                                       |

Even if creation was interrupted before any id reached the page, the engine keeps the key and reuses the payment that is already processing. Your server must make each operation run only once per key, and change states atomically. Deliver the order based on the confirmed status stored on the server — this must work even if the shopper has closed the browser.

## What is stored, and which messages are accepted {#storage-and-message-boundaries}

Session storage keeps only what is needed to continue: ids. It never keeps card fields, SDK data or client secrets. If you write your own `StorageAdapter`, implement `read`, `write` and `remove`, and keep different sessions apart.

A message from an iframe is accepted only if the sender, origin, message type and step id all match. Copying or scanning a code does not prove that the shopper paid: a `display` step finishes only through status checks. If copying to the clipboard fails, the shopper can copy the code by hand. Runners remove their elements, listeners and timers when they finish.

[WebView](./webview.md) covers mobile apps and deep links. [Troubleshooting](./troubleshooting.md) helps when the place to show a step is missing, the SDK does not answer or recovery fails.

## Safety rules for addresses {#url-security-defaults}

- Addresses of steps must use HTTPS.
- Provider SDK scripts load only from origins you list in `security.scriptOrigins`.
- Links to banking apps with their own scheme (for example `mybank://`) need `security.deeplinkProtocols`.
- Plain HTTP is allowed only for `localhost` during development, with `security.allowInsecureLocalhost: true`.
- The return address must belong to your own site.
- Where possible, import the provider's SDK as a package instead of loading a script.

[How to configure these rules and update old code](./production.md).
