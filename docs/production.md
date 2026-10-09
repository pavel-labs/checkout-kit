# Before accepting real payments

> [Русская версия](./ru/production.md)

Checkout kit coordinates a payment lifecycle across providers and hosts. Use it when your
application needs retries, authentication, redirects, recovery or an interface shared by
several providers. Start with `core`, one provider and a host runtime; React and UI are optional.
For a single hosted checkout without a custom lifecycle, your provider's own checkout may be sufficient.

The new security defaults and telemetry describe the current source and the next release.
The older `0.2.0` archive bundle does not contain them; build from source until the next tagged bundle.

## What you receive

| Capability            | Provided here                                                        | Your application's responsibility                                          |
| --------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Payment lifecycle     | Create, confirm, actions, processing, cancellation and recovery      | Choose capture policy; prevent conflicting order attempts on the server    |
| Instrument collection | SDK adapters, hosted-field runners and optional UI components        | Use provider fields/SDKs; the generic card form changes your PCI scope     |
| Retries               | Attempt keys retained for interrupted operations; action correlation | Durable, atomic idempotency records scoped to buyer, order and operation   |
| Payment outcome       | Read and map merchant API state                                      | Verify provider notifications and reconcile even if the browser closes     |
| Browser addresses     | HTTPS checks, origin rules, protected SDK loading                    | Configure provider destinations and CSP for the account/environment        |
| Operations            | Safe categorical telemetry and executable contract tests             | Monitoring, verified fulfillment, incident response and sandbox validation |

The library is not a payment processor, escrow service, fraud engine or PCI certification.
The named adapters have fixture and local simulator coverage. That is not evidence of a
completed live-account sandbox review. Six generic protocol packages are integration references.

## A safe browser configuration

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

The domains above are placeholders, not provider recommendations. Use documented origins
for your provider and account. `redirectOrigins` can restrict redirects to exact origins.
When omitted, HTTPS redirect origins are accepted because 3DS issuer ACS domains vary.
An empty allowlist denies that category. No wildcard or suffix matching is performed.
Origin permission trusts all paths on that origin; avoid origins hosting user-supplied scripts.

Default rules reject non-HTTPS transport, credentials in URLs, executable schemes,
unlisted action-supplied SDK scripts and unlisted custom app schemes. Return URLs must
belong to the application origin. Frames check origin, message type, action correlation
and sender. Hosted-field URL and message origins must match. Failures return
`aborted/runner_error` before navigation or rendering. `allowInsecureLocalhost: true`
is an explicit local-development option; it permits only loopback HTTP hosts.

Prefer importing SDKs directly. If you use an action's `scriptUrl`, allow its exact origin
in `scriptOrigins` and set provider `integrity` when that SDK supports a pinned version.
Use the provider's current CSP guidance. A same-origin iframe with both `allow-scripts`
and `allow-same-origin` is not an isolation boundary against malicious code from that origin.
These client checks complement server checks; they cannot protect a compromised merchant host.

## Keep card data out of your application

Stripe accepts PaymentMethod tokens. For Adyen, pass encrypted `state.data` from Adyen Web
or a saved method. Adyen rejects raw `card` instruments and raw `number`/`cvc` inside
component data unless `allowRawCardData: true` is explicitly configured. This flag does
not establish PCI eligibility. The example merchant server always rejects that raw path.
Generic card UI/reference adapters deliberately operate on card fields: use them only
after deciding and validating your merchant's applicable compliance scope.

Never send PAN, CVC, wallet tokens, client secrets, action parameters or full return URLs
to analytics, logs, support attachments or storage. Low-level engine events contain
provider data; use [safe telemetry](./observability.md) for metrics instead of serializing them.
Recovery storage projects only provider, intent, action, attempt key and timestamp; it is
untrusted input. The server must still enforce ownership, expiry and payment/action binding.

## Treat uncertain payment state as uncertain

| Situation                                           | Next step                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| Create or confirm response was lost                 | Keep the same attempt key; read/reconcile the existing payment                  |
| The server reports processing                       | Continue status checks; do not create a second payment for the order            |
| Redirect says `success` or an SDK callback resolves | Reconcile with your authenticated merchant API                                  |
| Shopper cancels or calls `reset()`                  | Verify whether the provider already charged; local reset does not undo a charge |
| Definite decline and a new method                   | Start a new attempt according to the order's server-side policy                 |

Never retry money-moving POSTs with a fresh key just because of a timeout. Browser memory
does not coordinate multiple tabs, devices or backend workers. Your server must enforce
the order's single-payment invariant and preserve keys/outcomes durably.

## Validate the merchant boundary

1. Authenticate buyers; authorize every read, mutation and receipt against the order owner.
2. Derive price/currency, customer, provider account and return URL from server-owned state.
3. Use HTTPS, secure session cookies, an explicit CSRF policy and a narrow CORS allowlist.
4. Verify webhook authenticity using the provider SDK/raw-body requirements, check account,
   order, amount/currency and capture state, and deduplicate/handle out-of-order events durably.
5. Fulfill once from verified merchant state. UI success is only for display/navigation.
6. Test declines, redirects/3DS, interrupted requests, processing, duplicate clicks,
   concurrent sessions, foreign evidence, signature mismatch and provider outages with the
   actual sandbox account. Record provider, SDK/API version, capture mode and test date.

The [example server](../examples/server/README.md) uses process-local records and a demonstration
session cookie. Replace those before deploying it. It verifies Adyen notifications; Stripe/PayPal
production notifications and durable fulfillment are merchant work, not implemented by that example.

## Public release gate

Run the documented tests, [consumer archive checks](./testing.md), composed-site navigation
tests and `release:npm-check`. Resolve dependency advisories in the shipped packages. Apply
pending changesets, choose a bundle version and record the account sandbox review before
claiming a production integration. See [Releasing](../RELEASING.md) for npm scope ownership,
first publication and OIDC setup. Public npm availability must be verified separately from
GitHub archive availability.

[Stripe PaymentIntents security](https://docs.stripe.com/payments/payment-intents) ·
[Adyen Web integration security](https://docs.adyen.com/online-payments/web-best-practices/) ·
[Security policy](../SECURITY.md)
