# Checkout kit

An embeddable checkout. Every payment integration behind it is a plugin.

**[Documentation](https://pavel-labs.github.io/checkout-kit/)** ·
[Русская версия](https://pavel-labs.github.io/checkout-kit/ru/) ·
[API reference](https://pavel-labs.github.io/checkout-kit/api/) ·
[Live demo](https://pavel-labs.github.io/checkout-kit/demo/)

The core is a headless engine. It creates a payment, presents an instrument, runs whatever
step the provider asks for next, and reports the outcome. It does not know what 3-D Secure
is, what a hosted payment page is, or what a wallet is. Six plugins do, and adding a seventh
changes nothing in the core.

Everything runs in the browser. A mock backend answers the APIs and a small https server
plays the bank, so the whole flow works with no real server: approval, decline,
authentication in a frame and as a full-page redirect, payments that settle later,
cancelling, receipts.

## Getting started

```bash
npm install

npm run dev:mock   # the demo checkout, with the mock payment backend
npm run dev:bank   # the 3-D Secure bank simulator (a second terminal, for the full flow)
```

The demo can also send the installed `@checkout-kit/provider-psp` plugin to your real
payment backend. Point it at your own server (the server owns the Stripe secret key) and
start the demo with:

```bash
$env:VITE_PAYMENT_API_BASE_URL='https://localhost:4000/api'
npm run dev
```

The existing Card processor tab then exercises the same checkout engine against your API.
Your server maps `/api/payment-intents` to Stripe PaymentIntents; the browser never receives
`sk_...`. The plugin sends the idempotency key and reads Stripe's `PaymentIntent.status`,
`next_action` and `last_payment_error`. This is useful because the application keeps one
payment flow and one UI while provider-specific API and 3-D Secure details stay in the
provider package. For a direct Stripe-shaped adapter, see `examples/providers/stripe.ts`.

There is a second, smaller app under `examples/react`: the same engine and the same UI kit,
in plain React with no form library, no schema and no router. It is the shorter read of the
two.

```bash
npm run dev:react -w @checkout-kit/examples    # the browser example, on the mock backend
npm run dev:server -w @checkout-kit/examples   # the Stripe / Adyen / PayPal sandbox server
```

The bank simulator serves https with a self-signed certificate: open
`https://localhost:5100/` once and accept it. See
[its notes](./apps/bank-sim/README.md) for how to generate the certificate.

```bash
npm run typecheck    # every package and app
npm run test         # unit tests and the plugin conformance suite
npm run test:e2e     # the checkout, end to end, against every integration
npm run build        # packages, then the demo
npm run verify:dist  # build the demo against the packages' published entry points
npm run purity       # fail if anything browser-only creeps into the core
```

## The one idea

Every integration is the same loop:

```text
createIntent → confirm(instrument) → [ action → run → evidence → resume ]* → terminal
```

Between a card processor, a bank, a hosted page, hosted fields, a wallet and a QR code, only
two things differ: **which action the provider returned** and **which runner executes it**.
That is checked, not just claimed: one Playwright spec file, which names no provider
anywhere, runs against all six.

| Integration        | instrument | first action                    | completes via  |
| ------------------ | ---------- | ------------------------------- | -------------- |
| Card processor     | `card`     | `redirect` into a frame         | `post_message` |
| Acquiring bank     | `card`     | `redirect` with a `PaReq`       | `post_message` |
| Bank payment page  | `none`     | `redirect` taking the window    | `return_url`   |
| Hosted card fields | `none`     | `collect_fields` in a frame     | `post_message` |
| Wallet             | `none`     | `sdk_handoff` to another script | `sdk_callback` |
| Instant transfer   | `none`     | `display` a QR or a code        | `poll`         |

## Packages

| Package                                | What it is                                                              |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `@checkout-kit/core`                   | domain, plugin contract, checkout engine, HTTP client. No React, no DOM |
| `@checkout-kit/runtime-browser`        | the runners that execute actions: frames, redirects, scripts, storage   |
| `@checkout-kit/react`                  | hooks over the engine, and a mount point for actions                    |
| `@checkout-kit/ui`                     | the payment components, the state screens, and one themable stylesheet  |
| `@checkout-kit/provider-psp`           | a Stripe-shaped API: JSON, idempotency header, 3-D Secure 2             |
| `@checkout-kit/provider-acquiring`     | direct bank acquiring: form-urlencoded, numeric statuses, 3-D Secure 1  |
| `@checkout-kit/provider-hpp`           | a hosted payment page: the shopper pays on the bank's own site          |
| `@checkout-kit/provider-hosted-fields` | the provider renders the card inputs and hands back a token             |
| `@checkout-kit/provider-wallet`        | a third-party SDK draws its own sheet                                   |
| `@checkout-kit/provider-bank-transfer` | a QR or a code, paid in the shopper's banking app                       |
| `@checkout-kit/webview-bridge`         | the contract a React Native app talks to the checkout through           |
| `@checkout-kit/testing`                | the mock backend, the card table, and test doubles for the engine       |
| `@checkout-kit/conformance`            | the contract every plugin has to pass                                   |

## Using it in an app

```tsx
import { createCheckout, defineProvider } from '@checkout-kit/core'
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
import { CheckoutProvider, useCheckout, PaymentActionHost } from '@checkout-kit/react'
import '@checkout-kit/ui/styles.css'

const runtime = createBrowserRuntime({ returnPath: '/payment/return' })

export const checkout = createCheckout({
  providers: [
    defineProvider({
      id: 'psp',
      config: { baseUrl: '/api', acsOrigin: 'https://acs.example' },
      load: () => import('@checkout-kit/provider-psp'),
      eager: true,
    }),
  ],
  defaultProviderId: 'psp',
  runners: runtime.runners,
  storage: runtime.storage,
  returnUrl: runtime.returnUrl,
})
```

Then: wrap the app in `<CheckoutProvider engine={checkout}>`, call `engine.pay(...)` from
your form, render `<PaymentActionHost/>` where an action is allowed to appear, and call
`engine.hydrate(params)` on the route a provider returns to. The demo in `apps/demo` does
exactly this and nothing more.

To add an integration of your own, see
**[Writing a payment plugin](./docs/plugin-authoring.md)**.

## How this compares

The alternatives are Stripe's Payment Element, Adyen's Drop-in and Braintree's Drop-in. They
are good. If you will only ever have one processor, they are less work than this.

|                       | Payment Element / Drop-in | This kit                       |
| --------------------- | ------------------------- | ------------------------------ |
| Processors            | one, theirs               | any, as a plugin               |
| Where the fields live | their iframe              | your DOM (or their iframe)     |
| Theming               | a fixed `appearance` API  | CSS variables and your own CSS |
| Plugin contract       | n/a                       | a test suite you must pass     |
| Native app            | their SDK                 | a WebView bridge               |
| Has taken real money  | yes                       | **no**                         |

Three things follow from the first row.

**Adding a processor does not change the core.** Six integration shapes already run behind
one engine and one UI: a JSON PSP, a form-urlencoded acquirer, a hosted page, hosted fields,
a wallet SDK and a QR transfer. A seventh is a new package, not a new branch in the engine.

**You own the DOM.** Elements are cross-origin iframes. You style them through a fixed schema
and stop where it stops. Here the kit renders real elements in your page, inside a `checkout`
cascade layer, so your CSS wins without a specificity fight. If you want the iframe - to keep
card data out of your page - `@checkout-kit/provider-hosted-fields` is that. It is your
choice per provider, not the library's.

**The contract is a test, not a promise.** `@checkout-kit/conformance` is a vitest suite every
plugin has to pass. It checks that declared instruments are exact both ways, that idempotency
really replays, that forged evidence is refused, that resuming twice does not charge twice,
and that no card data appears in anything a plugin returns.

Also: ESM-only, no runtime dependencies, about 22 kB of JS and 6 kB of CSS for one provider.

### What it does not do

**It has never taken a real payment.** All six plugins run against a mock backend. This is
the honest headline - see the status note below.

**It does not reduce your PCI scope.** Typing a card into your own page is what SAQ A-EP
means. Hosted fields and the hosted page change that; a UI kit does not.

**It has no server half.** No webhooks, no capture, no refunds, no settlement. The engine
stops at "the money moved or it did not". The rest is your backend's.

## Status and licence

Apache-2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).

The packages are published **privately**, to GitHub Packages under the `@checkout-kit` scope.
Installing them needs read access to this repository — see [Releasing](./RELEASING.md). Nothing
goes to npmjs.com.

That is deliberate: **all six plugins are written against a mock backend, and none of them has
taken a real payment.** They demonstrate the contract. Read them as a reference implementation,
not as an integration you can install and charge a card with — which is also why they are not
offered to strangers yet.

## Repository layout

An npm workspaces monorepo.

```text
examples/        real provider plugins (Stripe, Adyen, PayPal), a mock browser demo, a
                 minimal server for those adapters, and a React Native screen
                 — start at examples/README.md
packages/        the checkout packages listed above
apps/demo/       a checkout that uses them, with its e2e suite
apps/bank-sim/   the 3-D Secure bank simulator, on its own https origin
docs/            architecture and security notes
```

Inside the repo the apps resolve packages through a `@checkout-kit/source` condition, so they build
against TypeScript sources. `npm run verify:dist` builds them the way a published consumer
would. CI runs both.

## Architecture and docs

These all read on GitHub, and they are also the
[documentation site](https://pavel-labs.github.io/checkout-kit/), which adds a sidebar,
search and a generated API reference.

Every doc exists in English and Russian, except the bank simulator's notes.

- **Architecture** ([English](./docs/architecture.md) / [Русский](./docs/ru/architecture.md)) —
  what the pieces are, how a payment flows through them, and why the seams are where they
  are.
- **Using the payment plugins** ([English](./docs/plugins/index.md) / [Русский](./docs/ru/plugins/index.md)) —
  one page per plugin: which to pick, what your backend must provide, how to set it up, and
  what usually goes wrong.
- **Writing a payment plugin** ([English](./docs/plugin-authoring.md) / [Русский](./docs/ru/plugin-authoring.md)) —
  the contract, the rules that types cannot enforce, and the suite a plugin must pass.
- **The UI kit** ([English](./docs/ui.md) / [Русский](./docs/ru/ui.md)) — theming through
  tokens, the components, what the kit does for accessibility and what is left to you.
- **Integrating a real payment SDK** ([English](./docs/integrations.md) / [Русский](./docs/ru/integrations.md)) —
  Stripe, Adyen, Braintree, Checkout.com, PayPal, Apple and Google Pay, Klarna: what each
  hands you and which action it becomes.
- **The checkout in a native app** ([English](./docs/webview.md) / [Русский](./docs/ru/webview.md)) —
  the WebView bridge, the PAYMENT_* contract, navigation rules and returning from a bank.
- **Practical questions** ([English](./docs/adopting.md) / [Русский](./docs/ru/adopting.md)) —
  size, server rendering, screen readers, translation, and which browsers it drops.
- **The backend a plugin talks to** ([English](./docs/backend.md) / [Русский](./docs/ru/backend.md)) —
  the half this repository does not have: what your API must expose, why the plugin cannot
  call a provider directly, and a worked example.
- **Real providers, mapped onto the contract** ([English](./docs/real-world-providers.md) / [Русский](./docs/ru/real-world-providers.md)) —
  what Stripe, Adyen, PayPal, Apple Pay and a bank acquirer return, and which action a
  plugin produces for each.
- **Integration guides by region** — [Europe](./docs/providers/europe.md)
  ([ru](./docs/ru/providers/europe.md)), [the Americas](./docs/providers/americas.md)
  ([ru](./docs/ru/providers/americas.md)), [Asia](./docs/providers/asia.md)
  ([ru](./docs/ru/providers/asia.md)): the providers people actually use there, the local
  payment methods, and the banks.
- **Iframes and 3-D Secure** ([English](./docs/iframe.md) / [Русский](./docs/ru/iframe.md)) —
  how an embedded bank page is sandboxed and secured.
- **Security headers on the challenge page** ([English](./docs/security-headers.md) / [Русский](./docs/ru/security-headers.md)) —
  every header the bank simulator sends, one by one.
- **Mock payment API** ([English](./packages/testing/README.md) / [Русский](./packages/testing/README.ru.md)) —
  endpoints, the payment state machine, test cards, and why a retried request must not
  charge twice.
- **[Bank simulator](./apps/bank-sim/README.md)** — the standalone https bank, its two
  3-D Secure protocols, and where to inspect the security surface in DevTools.

## Tooling notes

Packages are built with [tsdown](https://tsdown.dev) (rolldown + oxc). Every build is
checked by publint and are-the-types-wrong. Type declarations are produced by oxc, which
needs an explicit type on every export — that is why `isolatedDeclarations` is on in every
package.

ESM only, on purpose. A dual ESM/CJS build ships two copies of every class, and then
`instanceof` gives the wrong answer as soon as a consumer mixes them.

### Expanding the Oxlint configuration

For a production app, consider enabling type-aware lint rules by installing
`oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "plugins": ["typescript", "oxc", "react"],
  "categories": { "correctness": "error", "pedantic": "warn" },
  "rules": { "typescript/no-floating-promises": "error" },
  "typeAware": true
}
```
