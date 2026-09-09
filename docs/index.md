---
layout: home

hero:
  name: Checkout kit
  text: One checkout, every provider
  tagline: An embeddable checkout whose payment integrations are all plugins. The core does not know what 3-D Secure is.
  actions:
    - theme: brand
      text: Architecture
      link: /architecture
    - theme: alt
      text: Write a plugin
      link: /plugin-authoring
    - theme: alt
      text: Live demo
      link: /demo/

features:
  - title: The processor is a plugin
    details: Six integration shapes already run behind one engine and one UI - a JSON PSP, a form-urlencoded acquirer, a hosted page, hosted fields, a wallet SDK and a QR transfer. A seventh is a new package, not a new branch in the engine.
    link: /architecture
    linkText: How the loop works
  - title: You own the DOM
    details: Not a cross-origin iframe you theme through a fixed schema. Real elements in your page, in a checkout cascade layer, so your CSS wins without a specificity fight.
    link: /ui
    linkText: The UI kit
  - title: The contract is a test
    details: Every plugin has to pass a runnable conformance suite - instruments exact both ways, idempotency that really replays, forged evidence refused, and no card data in anything returned.
    link: /plugin-authoring
    linkText: Writing a plugin
  - title: It runs where checkouts run
    details: A WebView bridge for native apps, and every layout decision a container query rather than a viewport one - the same checkout full-page, in a 360px WebView, or inside a merchant's iframe.
    link: /webview
    linkText: In a WebView
---

## The one idea

Every integration is the same loop:

```text
createIntent → confirm(instrument) → [ action → run → evidence → resume ]* → terminal
```

Between a card processor, a bank, a hosted page, hosted fields, a wallet and a QR code, only two
things differ: **which action the provider returned** and **which runner executes it**. That is
checked, not claimed - one Playwright spec, naming no provider anywhere, runs against all six.

| Integration        | instrument | first action                    | completes via  |
| ------------------ | ---------- | ------------------------------- | -------------- |
| Card processor     | `card`     | `redirect` into a frame         | `post_message` |
| Acquiring bank     | `card`     | `redirect` with a `PaReq`       | `post_message` |
| Bank payment page  | `none`     | `redirect` taking the window    | `return_url`   |
| Hosted card fields | `none`     | `collect_fields` in a frame     | `post_message` |
| Wallet             | `none`     | `sdk_handoff` to another script | `sdk_callback` |
| Instant transfer   | `none`     | `display` a QR or a code        | `poll`         |

## Status

Nothing is published to npm yet, and every package is still marked private. All six plugins are
written against a mock backend: **none of them has taken a real payment.** Read them as a reference
implementation, not as an integration you can install and charge a card with.
