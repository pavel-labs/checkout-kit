---
{
  "layout": "home",
  "hero": {
    "name": "Checkout kit",
    "text": "Payment flows you control",
    "tagline": "Headless engine, Stripe / Adyen / PayPal, browser and native hosts. Your interface and merchant API.",
    "actions": [
      {
        "theme": "brand",
        "text": "Build your checkout",
        "link": "/getting-started"
      },
      {
        "theme": "alt",
        "text": "Choose packages",
        "link": "/packages"
      },
      {
        "theme": "alt",
        "text": "Try the demo",
        "link": "/demo/"
      }
    ]
  },
  "features": [
    {
      "title": "Three provider adapters",
      "details": "PaymentIntents, Adyen Advanced flow and PayPal Orders, with exact merchant contracts and a runnable HTTP server.",
      "link": "/packages#named-provider-adapters",
      "linkText": "Read the guide"
    },
    {
      "title": "Your checkout interface",
      "details": "React bindings and optional UI. Your layouts, provider SDKs for instrument collection.",
      "link": "/react",
      "linkText": "Read the guide"
    },
    {
      "title": "Recovery and retries",
      "details": "Preserve attempts across redirects and lost replies; verify existing payments before another charge.",
      "link": "/runtime",
      "linkText": "Read the guide"
    },
    {
      "title": "Native hosts",
      "details": "Typed WebView sessions, strict messages, safe commands and deep-link recovery.",
      "link": "/webview",
      "linkText": "Read the guide"
    },
    {
      "title": "Executable contracts",
      "details": "Fixture and browser scenarios, paid replay, foreign evidence and isolated package installation.",
      "link": "/testing",
      "linkText": "Read the guide"
    },
    {
      "title": "16 packages",
      "details": "Engine plus one adapter; add host/UI/test pieces and six reference protocols when needed.",
      "link": "/packages",
      "linkText": "Read the guide"
    }
  ]
}
---

## Start with a working flow

~~~sh
npm ci
npm run dev:integration
~~~

In the [repository](https://github.com/pavel-labs/checkout-kit), this starts React and a merchant server with local simulators, without account keys. [Getting started](./getting-started.md) leads to archives and your selected sandbox.

## Choose your path

| Starting point | Guide |
| --- | --- |
| Stripe / Adyen / PayPal | [Stripe](./providers/stripe.md), [Adyen](./providers/adyen.md), [PayPal](./providers/paypal.md). |
| Existing React interface | [React](./react.md), [UI](./ui.md), [runtime](./runtime.md). |
| Another PSP or bank | [References](./plugins/index.md), [contract](./plugin-authoring.md), [testing](./testing.md). |
| Native app | [WebView](./webview.md) and the host example. |

## One lifecycle, explicit boundaries

The engine creates an intent, confirms an instrument, runs actions and verifies the result. Providers own wire protocols, runners own surfaces and merchants own prices, buyers and payment truth.

All 16 packages have ESM archives, declarations, API and tests. Generic references do not certify named banks. Account verification and publishing remain separate steps. [Merchant integration](./merchant-integration.md) describes responsibilities; [troubleshooting](./troubleshooting.md) helps resolve failures.
