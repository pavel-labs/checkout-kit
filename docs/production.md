# Before accepting real payments

> [Русская версия](./ru/production.md)

Checkout kit runs the steps of a payment for different providers and different kinds of apps. It is useful when your app needs retries, bank checks (3DS), redirects, recovery after a reload, or one interface for several providers. Start with `core`, one provider package and a runtime for your app. React and UI are optional.

If you only need one provider's ready payment page and nothing custom, that provider's own checkout may be enough.

**Note about versions.** The safety defaults and telemetry on this page are in the current source code and will ship in the next release. The older `0.2.0` archive does not have them. Until the next release, build the packages from source.

## What the library does and what you must do {#what-you-receive}

| Area                       | What checkout kit does                                                              | What your application must do                                                             |
| -------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Payment steps              | Create, confirm, extra steps, processing, cancel and recovery.                      | Choose when money is captured. Prevent conflicting payments for one order on the server.  |
| Collecting payment details | SDK adapters, runners for provider card fields and optional UI components.          | Use the provider's fields or SDK. The generic card form makes your PCI duties larger.     |
| Retries                    | Keeps the attempt key after an interrupted request; links each step to its payment. | Store idempotency records in a database, atomically, per buyer, order and operation.      |
| Payment result             | Reads the state from your server and turns it into a result.                        | Check provider notifications, and reconcile even if the browser was closed.               |
| Browser addresses          | HTTPS checks, origin rules, protected loading of SDK scripts.                       | Set the provider addresses and CSP for your account and environment.                      |
| Operations                 | Safe metrics and ready contract tests.                                              | Monitoring, delivering orders after confirmed payment, incident handling, sandbox checks. |

The library is **not**:

- a payment processor;
- an escrow service;
- a fraud detection system;
- a PCI certification.

The Stripe, Adyen and PayPal adapters are covered by test data and a local simulator. That does **not** mean they were fully checked with a real sandbox account. The six generic protocol packages are only examples.

## A safe browser setup {#a-safe-browser-configuration}

```ts
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'

const runtime = createBrowserRuntime({
  returnPath: '/checkout/return',
  security: {
    frameOrigins: ['https://fields.your-provider.example'],
    scriptOrigins: [], // Import the official SDK in your host; no action may load a script.
    imageOrigins: ['https://images.your-provider.example'],
    deeplinkProtocols: ['yourbank:'], // Only when your actual bank integration needs this.
  },
})
```

The domains above are examples. Use the addresses from your provider's documentation for your account.

How the lists work:

- `frameOrigins`, `scriptOrigins`, `imageOrigins` and `deeplinkProtocols` list what is allowed. An **empty list** forbids everything of that kind.
- `redirectOrigins` can limit redirects to exact origins. If you do not set it, any HTTPS redirect is allowed, because the 3DS pages of different banks live on many different domains.
- There are no wildcards and no "ends with" matching. Each entry is one exact origin.
- Allowing an origin allows **every path** on it. Do not allow origins where users can upload their own scripts.

What is blocked by default:

- addresses without HTTPS;
- logins and passwords inside addresses;
- executable schemes such as `javascript:`;
- SDK scripts that a step tries to load from an address not in your list;
- app links with a custom scheme that is not in your list.

Also:

- the return address must belong to your own site;
- iframe messages are checked by origin, message type, step id and sender;
- for hosted fields, the iframe address and the message origin must match;
- if a check fails, the step ends with `aborted/runner_error` **before** anything is opened or shown;
- `allowInsecureLocalhost: true` is for local development only. It allows plain HTTP only for `localhost` addresses.

About scripts: it is better to import the provider's SDK as a package. If you use a step's `scriptUrl`, add its exact origin to `scriptOrigins` and set the `integrity` hash when the SDK has fixed versions. Follow your provider's current CSP advice.

An iframe from your own origin with both `allow-scripts` and `allow-same-origin` does **not** isolate anything: code inside it can reach your page. All these browser checks add to the server checks; they do not replace them. They cannot protect a server that has already been hacked.

## Keep card data out of your app {#keep-card-data-out-of-your-application}

- **Stripe** takes PaymentMethod tokens.
- **Adyen** takes the encrypted `state.data` from Adyen Web or a saved payment method. Raw card data (a `card` instrument, or `number`/`cvc` inside the component data) is rejected unless you set `allowRawCardData: true`. This flag does not make you PCI compliant. The example server always rejects raw card data.
- **The generic card UI and the example adapters** work with card fields on purpose. Use them only after you have decided which compliance rules apply to your business and have checked them.

Never send these to analytics, logs, support tickets or storage:

- the card number (PAN) or CVC;
- wallet tokens;
- client secrets;
- step parameters;
- full return addresses.

Low-level engine events contain provider data. For metrics, use [safe telemetry](./observability.md) instead of saving the events themselves.

Recovery storage keeps only the provider, payment id, step id, attempt key and time. Treat it as untrusted input: the server must still check who owns the payment, that it has not expired, and that the step belongs to this payment.

## If the result is unclear, treat it as unclear {#treat-uncertain-payment-state-as-uncertain}

| Situation                                                 | What to do next                                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| The reply to "create" or "confirm" was lost               | Keep the same attempt key. Read the existing payment and compare.                        |
| The server says "processing"                              | Keep checking the status. Do not create a second payment for the order.                  |
| The return address says `success`, or the SDK says "done" | Check with your server API, where the user is logged in.                                 |
| The shopper cancels, or you call `reset()`                | Check whether the provider already took the money. A local reset does not undo a charge. |
| A clear decline, and the shopper picks another method     | Start a new attempt, following your server's rules for this order.                       |

Never repeat a request that moves money with a **new** key just because it timed out. Browser memory cannot coordinate several tabs, devices or server processes. Your server must make sure each order is paid only once, and must store keys and results in a database.

## Checklist for your server {#validate-the-merchant-boundary}

1. Log in buyers. For every read, change and receipt, check that the order belongs to this buyer.
2. Take the price, currency, customer, provider account and return address from the server's own data, never from the browser.
3. Use HTTPS, secure session cookies, a clear CSRF policy and a short CORS allowlist.
4. Check that webhooks are real, following the provider's SDK rules (often you need the raw request body). Check the account, order, amount, currency and capture state. Store events in a database, skip duplicates and handle events that arrive out of order.
5. Deliver the order once, based on the confirmed status on your server. A "success" screen is only for display and navigation.
6. With your real sandbox account, test: declines, redirects and 3DS, interrupted requests, processing, double clicks, parallel sessions, data from another order, wrong signatures and provider outages. Write down the provider, SDK/API version, capture mode and test date.

The [example server](../examples/server/README.md) keeps records in memory and uses a demo session cookie. Replace both before you deploy it. It checks Adyen notifications. Stripe and PayPal production notifications and reliable order delivery are your job; the example does not implement them.

## Before a public release {#public-release-gate}

- Run the documented tests, the [package install checks](./testing.md), the site navigation tests and `release:npm-check`.
- Fix security advisories in the dependencies of the shipped packages.
- Apply pending changesets, choose the bundle version and write down the sandbox account review.

Only after that call an integration production-ready. [Releasing](../RELEASING.md) covers npm scope ownership, the first publication and OIDC. Check separately that the packages are really available on npm; GitHub archives being available does not mean that.

[Stripe PaymentIntents security](https://docs.stripe.com/payments/payment-intents) ·
[Adyen Web integration security](https://docs.adyen.com/online-payments/web-best-practices/) ·
[Security policy](../SECURITY.md)
