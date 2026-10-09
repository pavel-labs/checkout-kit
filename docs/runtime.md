# Browser runtime and recovery

> [Русская версия](./ru/runtime.md)

`@checkout-kit/runtime-browser` executes actions. The engine owns the attempt; runners supply evidence; your provider and merchant API establish payment.

## Wire the browser once

```ts
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
const runtime = createBrowserRuntime({ returnPath: '/checkout/payment/return' })
// Give createCheckout runtime.runners, runtime.storage and runtime.returnUrl.
```

Include the deployed base path in `returnPath`. It resolves against the current origin. Default engine memory storage cannot survive full-page navigation; use runtime storage.

| Action           | Behavior                                                       | Host setup                                          |
| ---------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| `redirect`       | GET/POST in an iframe or top window; preserve URL/form fields. | A mount for iframe; a working return route for top. |
| `collect_fields` | Provider-owned iframe returns an opaque token by postMessage.  | Mount and exact frame origin.                       |
| `sdk_handoff`    | Request a registered adapter, optionally load its SDK script.  | Adapter matching `action.sdk`.                      |
| `display`        | Show QR/code/instructions while the engine polls.              | Mount and optional provider-rendered QR URL.        |

A headless host supplies `createMount(element)` to `engine.runPendingAction({ mount })`. React uses `PaymentActionHost`. There is no supplied popup runner; register your own for that surface.

## SDK lifecycle

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

Your host implements `walletSdk`. Resolve the payload expected by the provider after the SDK finishes, not when a component mounts. [Stripe](./providers/stripe.md) supplies an SDK adapter; [Adyen](./providers/adyen.md) resolves additional details.

Scripts are shared by URL and reject conflicting integrity settings. The runner bounds waits by deadline and abort; the host should also dismiss the SDK UI on abort.

## Restore a redirect

Recreate the same registrations/storage on the return route:

```ts
const result = await engine.hydrate(runtime.readReturnParams())
```

Hydration reads saved provider, intent and action, then re-reads the order. Verified final state needs no new confirmation/capture. Evidence is bound to the saved action. A temporary outage preserves metadata: retry hydrate with the original parameters.

Serve the app at the exact return path. Keep query parameters and the same session storage until recovery completes. A different tab/system browser requires host-managed recovery.

## Attempts, retries and cancellation

| Situation                             | Operation                                                         |
| ------------------------------------- | ----------------------------------------------------------------- |
| Lost creation or confirmation reply   | Retry the same attempt/key; reconcile its existing intent.        |
| Processing                            | Poll the same intent; a timeout remains unresolved.               |
| Verified decline/cancel               | A next payment may use a fresh intent/key.                        |
| Start over                            | `reset()` clears local state; it does not cancel a server charge. |
| Shopper cancellation                  | `abort()` stops work and requests cancellation when supported.    |
| Payment succeeded during cancellation | Preserve succeeded; UI cannot reverse payment history.            |

The engine retains a key after an interrupted creation even if no id reached the page, and reuses the existing processing intent. The backend must enforce scoped idempotency and transitions atomically. Fulfillment comes from durable verified state, also after the browser closes.

## Storage and message boundaries

Session storage persists resumable metadata without card fields, SDK payloads or client secrets. A custom `StorageAdapter` implements `read`, `write` and `remove`, isolating sessions.

Iframe evidence must match sender, origin, type and action id. Copying/scanning a code does not prove payment; display finishes through polling. Clipboard failure supports manual copying, and runner DOM/listeners/timers are cleaned up.

[WebView](./webview.md) covers native sessions and deep links. [Troubleshooting](./troubleshooting.md) covers missing mounts, SDKs and recovery.
