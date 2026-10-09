# @checkout-kit/webview-bridge

Typed events and commands between a web checkout and its React Native WebView host. The package has three entry points; native code imports `/host` or `/protocol`, which run without DOM globals or a React Native dependency.

| Import                                  | Environment                                                               |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `@checkout-kit/webview-bridge`          | Web page: `createWebViewBridge(engine, options)`.                         |
| `@checkout-kit/webview-bridge/host`     | Native host: message routing, commands, navigation and deep-link helpers. |
| `@checkout-kit/webview-bridge/protocol` | Types, version and strict message parsers.                                |

## Web page

```ts
import { createWebViewBridge } from '@checkout-kit/webview-bridge'
const bridge = createWebViewBridge(engine, { reportHeight: true })
// Register once for this document, and call bridge.stop() when disposing the checkout.
```

The bridge detects `window.ReactNativeWebView` and is a no-op in a normal browser. It emits `PAYMENT_READY`, state/action events and verified outcomes. Payloads are selected field by field and do not include card data. `onError` can report a native delivery failure without affecting payment execution.

## Native host

```ts
import {
  createBridgeCommand,
  createCheckoutMessageHandler,
  createCommandScript,
} from '@checkout-kit/webview-bridge/host'

const handle = createCheckoutMessageHandler({
  PAYMENT_SUCCEEDED: (event) => showReceipt(event.payload.intentId),
})
// WebView.onMessage: handle(event.nativeEvent.data), only for the merchant checkout URL.

if (handle.sessionId) {
  const command = createBridgeCommand(
    'PAYMENT_CANCEL',
    {},
    {
      sessionId: handle.sessionId,
      id: 'native:1', // unique within this session
    },
  )
  webview.injectJavaScript(createCommandScript(command))
}
```

Commands must carry the session received from `PAYMENT_READY`, not an arbitrary native id. The bridge rejects another session, duplicate ids, malformed payloads and commands sent by provider frames. A ping returns `PAYMENT_READY` with the command id as `correlationId`. The native handler retires the previous session only when a new ready handshake arrives and drops repeated events.

Use `createCommandScript` rather than interpolating a return token into JavaScript. It serializes parameters as data and works with `WebView.injectJavaScript`. Filter `onMessage` by the merchant document URL even when navigation permits bank pages.

`createNavigationPolicy({ allow, openExternally, returnScheme })` compares HTTPS origins and path directory boundaries; `/checkout` does not permit `/checkout-admin`. Feed matching deep links through `parseReturnDeepLink` and send `PAYMENT_RESUME` with the parsed parameters. Resume re-reads the merchant's order; a deep link does not establish success.

[Native example](https://github.com/pavel-labs/checkout-kit/tree/main/examples/react-native-checkout) · [WebView guide](https://pavel-labs.github.io/checkout-kit/webview.html)
