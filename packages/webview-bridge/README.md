# @checkout-kit/webview-bridge

A mobile app can show the checkout web page inside a WebView (a browser component inside the app). `@checkout-kit/webview-bridge` lets the page and the app talk to each other safely: the page reports what is happening with the payment, and the app can send commands, such as "cancel".

The package has three entry points. The native side imports `/host` or `/protocol`. These work without a browser and without a React Native dependency.

| Import                                  | Where it runs                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `@checkout-kit/webview-bridge`          | On the web page: `createWebViewBridge(engine, options)`.                         |
| `@checkout-kit/webview-bridge/host`     | In the app: handling messages, sending commands, navigation rules, return links. |
| `@checkout-kit/webview-bridge/protocol` | Anywhere: types, the protocol version and strict message parsers.                |

## On the web page

```ts
import { createWebViewBridge } from '@checkout-kit/webview-bridge'
const bridge = createWebViewBridge(engine, { reportHeight: true })
// Register once for this document, and call bridge.stop() when disposing the checkout.
```

- The bridge finds `window.ReactNativeWebView` by itself. In a normal browser it does nothing.
- It sends `PAYMENT_READY`, state and step events, and checked results.
- The data in each message is picked field by field. It never contains card data.
- `onError` can report that a message could not be delivered to the app. This does not affect the payment.

## In the app

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

How sessions and commands work:

- Every command must carry the session id from the `PAYMENT_READY` message, not some id you made up in the app.
- The page rejects commands from another session, commands with a repeated id, broken data and commands sent from provider frames.
- A `ping` command gets `PAYMENT_READY` back, with the command id in `correlationId`.
- The app forgets the old session only when a new `PAYMENT_READY` arrives. Repeated events are dropped.

Safety rules:

- Build commands with `createCommandScript`. Do not paste a return token into a JavaScript string yourself. The function passes parameters as data and works with `WebView.injectJavaScript`.
- In `onMessage`, accept messages only from your checkout page address — even if the WebView is allowed to open bank pages.

**Navigation.** `createNavigationPolicy({ allow, openExternally, returnScheme })` compares HTTPS origins and whole path folders: allowing `/checkout` does **not** allow `/checkout-admin`. When a return link with your scheme arrives, parse it with `parseReturnDeepLink` and send `PAYMENT_RESUME` with the parsed parameters. The page then reads the order from your server again. The return link itself does not mean that the payment succeeded.

[Mobile app example](https://github.com/pavel-labs/checkout-kit/tree/main/examples/react-native-checkout) · [WebView guide](https://pavel-labs.github.io/checkout-kit/webview.html)
