---
{
  'layout': 'home',
  'hero':
    {
      'name': 'Checkout kit',
      'text': 'Online payments you control',
      'tagline': 'One payment flow for Stripe, Adyen, PayPal or your own provider. Works in the browser and in mobile apps. You keep your own interface and server.',
      'actions':
        [
          { 'theme': 'brand', 'text': 'Get started', 'link': '/getting-started' },
          { 'theme': 'alt', 'text': 'Choose packages', 'link': '/packages' },
          { 'theme': 'alt', 'text': 'Try the demo', 'link': '/demo/', 'target': '_self' },
          {
            'theme': 'alt',
            'text': 'Explore UI Gallery',
            'link': '/demo/gallery/',
            'target': '_self',
          },
        ],
    },
  'features':
    [
      {
        'title': 'Stripe, Adyen and PayPal',
        'details': 'Ready support for three providers, with exact server routes and a working example server.',
        'link': '/packages#named-provider-adapters',
        'linkText': 'Read the guide',
      },
      {
        'title': 'Your own interface',
        'details': 'React hooks and optional ready components. Card fields come from the provider, so card data never touches your code.',
        'link': '/react',
        'linkText': 'Read the guide',
      },
      {
        'title': 'No double charges',
        'details': 'The payment survives a page reload, a trip to the bank page and a lost reply. Before a new charge, the old payment is checked.',
        'link': '/runtime',
        'linkText': 'Read the guide',
      },
      {
        'title': 'Mobile apps',
        'details': 'Run the checkout inside a WebView in an iOS or Android app, with checked messages and return links.',
        'link': '/webview',
        'linkText': 'Read the guide',
      },
      {
        'title': 'Ready tests',
        'details': 'Test data, browser scenarios and a test suite that checks your own provider plugin.',
        'link': '/testing',
        'linkText': 'Read the guide',
      },
      {
        'title': 'Safe by default',
        'details': 'HTTPS only, provider scripts only from allowed addresses, and metrics that never contain payment data.',
        'link': '/production',
        'linkText': 'Read the guide',
      },
    ],
}
---

## Install from npm

```sh
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal
```

Run this in your own app. All 16 packages are published on public npm; no token or private registry is needed. The [catalog](./packages.md) links each package, and [Getting started](./getting-started.md#install-from-npm) covers Stripe, Adyen, React, UI, WebView and test tools.

## Start with a working example

```sh
npm ci
npm run dev:integration
```

Run this in the [repository](https://github.com/pavel-labs/checkout-kit). It starts a React checkout and a test server with fake providers, so you do not need any account keys. Then [Getting started](./getting-started.md) shows how to install the packages and connect a real test account.

## Where to go next

| What you have            | Read this                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| Stripe, Adyen or PayPal  | [Stripe](./providers/stripe.md), [Adyen](./providers/adyen.md), [PayPal](./providers/paypal.md).    |
| A React app              | [React](./react.md), [UI](./ui.md), [browser runtime](./runtime.md).                                |
| Another provider or bank | [Examples](./plugins/index.md), [writing a plugin](./plugin-authoring.md), [testing](./testing.md). |
| A mobile app             | [WebView](./webview.md) and the app example.                                                        |
| Unfamiliar words         | [Glossary](./glossary.md).                                                                          |

## Who does what

The engine creates a payment, sends the payment details, runs any extra steps (for example, the bank's 3-D Secure page) and then checks the result.

- The **provider plugin** knows how to talk to one provider.
- The **runner** shows the extra step in your app (iframe, redirect, SDK).
- **Your server** knows the prices, knows the buyer and decides whether the order is paid.

All 16 packages come with JavaScript (ESM), TypeScript types, API docs and tests. The example plugins show common protocols; they are not certified for any real bank. All packages are available on npm. Checking with your own provider test account is still required for your integration. [Merchant server](./merchant-integration.md) lists what your server must do. [Troubleshooting](./troubleshooting.md) helps when something fails.
