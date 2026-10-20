# Checkout in a React Native WebView

This example shows a mobile app that opens your existing HTTPS checkout page inside a WebView.

- `CheckoutScreen.tsx` is the screen with the WebView.
- `App.tsx` shows how to add this screen to the app.
- On the native side, import only `@checkout-kit/webview-bridge/host` and `/protocol`.
- The web page calls `createWebViewBridge(engine)` once.

## Install in your app

Install the published bridge and its core peer in both the web checkout and native host:

```bash
npm install @checkout-kit/core @checkout-kit/webview-bridge
```

In an Expo host, also run `npx expo install react-native-webview`. For bare React Native, install `react-native-webview` and complete its native platform setup. Keep your app's existing compatible React and React Native versions.

[npm package](https://www.npmjs.com/package/@checkout-kit/webview-bridge) · [All package installation options](https://pavel-labs.github.io/checkout-kit/getting-started.html#install-from-npm)

## Setup

1. Set `CHECKOUT_URL` to your checkout page address.
2. Register the return link `myapp://payment/return` in your iOS and Android deep link settings.
3. If your provider needs to show a bank page in the whole WebView window, add it to `allowedProviderUrls`.

The navigation rules allow only exact origins and whole path folders. The message handler accepts events only from your checkout page.

## Commands

- Commands wait for `PAYMENT_READY`. Each command carries its session id and its own unique id.
- They are sent with `createBridgeCommand` and `createCommandScript` through `injectJavaScript`. Return tokens are passed as data, not pasted into code.
- Repeated commands and events from an old page are ignored.
- The cancel button stays disabled until the bridge is ready.

## Return links

- A return link that arrives through `Linking`, or that the WebView catches, is parsed and sent back to the page as `PAYMENT_RESUME`. The WebView does not open your custom scheme as a page.
- A return that arrives before the handshake is queued until the page is ready.
- Normal HTTPS returns to the checkout load as usual, and the web app restores its saved payment by itself.

If the bank check runs in a system browser session, your app must start that session and pass its return address through the same helper. Just opening the address from `PAYMENT_REQUIRES_ACTION` is not enough for providers that need POST form fields: let the web runtime do that redirect, or implement the provider's full native flow.

## Using the example

Copy these files into your Expo or React Native app and install the dependencies it needs. The example is kept outside the repository workspaces on purpose, so installing the web library does not pull in native tools.

The repository tests cover the bridge messages, session isolation, navigation and command encoding. You still need to build and try the app on iOS and Android.

[WebView guide](https://pavel-labs.github.io/checkout-kit/webview.html) · [Bridge package](../../packages/webview-bridge/README.md)
