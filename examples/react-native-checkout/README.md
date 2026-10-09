# Checkout in a React Native WebView

`CheckoutScreen.tsx` hosts an existing HTTPS web checkout; `App.tsx` shows how to mount the screen. Import only `@checkout-kit/webview-bridge/host` and `/protocol` on the native side. The web page registers `createWebViewBridge(engine)` once.

Set `CHECKOUT_URL` and register `myapp://payment/return` in your application's iOS/Android deep-link configuration. Add `allowedProviderUrls` when your selected provider needs a top-window bank page inside the WebView. The navigation policy allows exact origins and directory boundaries, and the message handler accepts events only from the merchant checkout document.

Commands wait for `PAYMENT_READY` and use its session id plus a unique command id. They are delivered with `createBridgeCommand` and `createCommandScript` through `injectJavaScript`; return tokens are serialized as data. Duplicates and events from a retired page are ignored. Cancel is disabled until the bridge is ready.

A return deep link received through `Linking` or intercepted by the WebView is parsed and sent back as `PAYMENT_RESUME`. The custom scheme is not loaded as a WebView page. A return received before the checkout handshake is queued until it is ready. Ordinary HTTPS checkout returns load normally and the web app hydrates its own saved attempt.

For a system-browser authentication session, your app must start the platform session and deliver its return URL through the same helper. Opening a URL from `PAYMENT_REQUIRES_ACTION` alone is insufficient for providers requiring form POST fields; let the web runtime perform that redirect or implement the provider's full platform flow.

Drop these files into your Expo or React Native application and supply its dependencies. This example is deliberately outside the repository workspaces so installing the web library does not pull in a native toolchain. Repository tests cover bridge payloads, session isolation, navigation and command serialization; the example still needs an iOS/Android build in the consuming app.

[WebView guide](https://pavel-labs.github.io/checkout-kit/webview.html) · [Bridge package](../../packages/webview-bridge/README.md)
