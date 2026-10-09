# Troubleshooting

> [Русская версия](./ru/troubleshooting.md)

Start with phase, provider, intent id, action kind and error code, then inspect the corresponding merchant request. Keep card fields, tokens, client secrets and raw SDK responses out of logs.

## Setup

| Symptom | Check / fix |
| --- | --- |
| Unpublished peer download | Install selected archives and peers in one command; see [installation](./getting-started.md#install-package-archives). |
| Unstyled UI | Import `@checkout-kit/ui/styles.css` and use CheckoutRoot / .ck-root. |
| SSR window error | Instantiate runtime/bridge on the client; React/UI import and render separately. |
| Unknown provider | Import its config type and register its actual id/module. |
| Missing cookie / API failure | Verify baseUrl, origin, credentials, hostname and buyer session. |

## Pending actions

| Symptom | Check / fix |
| --- | --- |
| Action pending without a page | Mount PaymentActionHost or call runPendingAction. |
| No mount | Use createMount(element) for iframe/inline actions and keep it visible. |
| No SDK adapter | Its sdk id must match action.sdk; follow [provider setup](./packages.md#named-provider-adapters). |
| SDK resolves too early | Resolve its result/additional-details callback, not component mount. |
| Integrity conflict | One script URL/hash per session; reload before changing it. |
| Iframe ignores evidence | Check exact origin, sender, type and action correlation; do not use wildcard trust. |
| Unsupported action | Enable supported methods or implement that returned action type. |
| QR never completes | Verify merchant status, notifications and polling; scanning is not payment proof. |

## Recovery and status

| Symptom | Check / fix |
| --- | --- |
| Return route 404 | Serve the app at the exact deployed return path. |
| No saved checkout | Pass runtime.storage; keep the same session and avoid reset before hydrate. |
| Recovery API outage | Preserve parameters and retry hydrate when reachable. |
| Processing timeout | Check the same intent before allowing another charge. |
| Stripe capture_required | Capture on the merchant server; the example uses automatic capture. |
| PayPal capture_unverified | Return verified capture status/amount/currency, not order status alone. |
| Adyen Pending / Received | Check webhook HMAC, account, ordering and durable merchant state. |
| Foreign/invalid evidence | Use the saved action for this order. |
| HTTP 409 replay | Payload changed under one operation key; check its original result. |
| Retry stays disabled | isLocked includes final phases; use a separate recovery condition. |

## Native bridge

Use the session from PAYMENT_READY and unique command ids. createBridgeCommand / createCommandScript safely serialize injection. Stale/duplicate commands are ignored; ping answers with correlated ready metadata.

Filter onMessage by the merchant document URL. Allowed bank navigation does not make a bank page an authority. Send custom-scheme return data as PAYMENT_RESUME instead of loading that URL.

[The native example](../examples/react-native-checkout/README.md) queues pre-handshake returns and implements navigation branching. Browser tests do not replace an actual iOS/Android build.

## Isolate the failure

Run `npm run dev:integration` to compare account integration with a local simulator. If the simulator works, inspect sandbox configuration/merchant/SDK. Otherwise run the affected package and [contract tests](./testing.md).
