# Practical questions

> Русская версия: [ru/adopting.md](./ru/adopting.md)

Questions a team usually asks before adding a checkout to their app: how big is it, does it work with server-side rendering, how does it work with screen readers, can it be translated, and which browsers does it support.

## How big is it {#how-big-is-it}

Measured on 2026-10-09: each package's main entry point was bundled and minified with esbuild, then compressed with gzip. All exports of the entry point are included. Dependencies (React, core, provider SDKs) are not counted in each row. Your bundler may remove unused exports (tree-shaking), so also measure your own final bundle.

| Package                                     | gzip        |
| ------------------------------------------- | ----------- |
| `@checkout-kit/core`                        | 6.8 KiB     |
| `@checkout-kit/runtime-browser`             | 3.2 KiB     |
| `@checkout-kit/react`                       | 1.0 KiB     |
| `@checkout-kit/ui` (root JS)                | 9.1 KiB     |
| `@checkout-kit/ui/styles.css` (all imports) | 6.2 KiB     |
| Provider root                               | 1.0–1.9 KiB |
| `@checkout-kit/webview-bridge` root         | 2.1 KiB     |

The selected provider is loaded with a dynamic import, only when needed. React, Stripe.js, Adyen Web and QR code libraries are not bundled into the kit. See [the package list](./packages.md).

## Server-side rendering {#server-rendering}

`@checkout-kit/core` has no browser code, and `npm run purity` fails the build if some gets in. `@checkout-kit/react` reads the engine through `useSyncExternalStore` with a server snapshot. So a component that shows the phase or the amount renders on the server without problems.

Only two things need a browser:

- **`createBrowserRuntime()`** reads `window.location` to build the return address. Create the engine in the browser: either at the top level of a file that only the client imports, or inside an effect.
- **`<PaymentActionHost/>`** does its work in an effect. On the server it renders an empty `<div>` and starts nothing.

There is no server state to transfer to the client. A payment in progress lives in session storage, and `hydrate()` picks it up after a redirect. Call `hydrate()` in the route loader, not in an effect — see [Architecture](./architecture.md).

## Screen readers and keyboard {#screen-readers-and-keyboard}

What the kit takes care of:

- Frames have a title. Set one the shopper will understand, for example `redirect: { frameTitle: () => 'Bank authentication' }`. A screen reader reads this title when focus moves into the bank's page.
- The runner that shows a code marks the copy button area as a polite live region, so "Copied" is read aloud. You can set the alt text of the QR image.
- Every field the kit renders goes through `Field`. It gets a label, an id, and its hint and error are linked with `aria-describedby`. Field errors are announced politely; only the payment error is an alert. See [the UI kit](./ui.md).
- Everything is real HTML: a button is a `<button>`, a link is an `<a>`. Provider tabs use tab roles; status and error components use live regions. When you build your own interface from the components, keep their labels, descriptions and state attributes.

What you must do yourself, because only you know your layout:

- **Announce the payment state.** The phase is in the snapshot. Putting it into an `aria-live="polite"` region takes a few lines, and without it a screen reader user hears nothing. The kit cannot do this for you, because it does not control your layout.
- **Move focus on purpose.** When a step opens or a payment finishes, decide where the focus goes.
- **Show errors near the field.** `PaymentError.message` is written for the shopper. Show it where the shopper is looking, with `role="alert"`.

The demo does the last two: errors are shown through `ErrorText` with `role="alert"`, and the waiting state has `role="status"`. Announcing every phase change is left to your app, because only your app knows where in the layout it belongs.

## Languages {#languages}

Every text the kit shows on the screen can be replaced:

```ts
createBrowserRuntime({
  returnPath: '/payment/return',
  redirect: { frameTitle: () => t('checkout.bankAuthentication') },
  collectFields: { frameTitle: () => t('checkout.cardDetails') },
  display: {
    text: {
      copy: t('common.copy'),
      copied: t('common.copied'),
      openApp: t('checkout.openBankApp'),
    },
  },
})
```

Messages that come back from a payment are different. `PaymentError.message` is the provider's text, usually from the shopper's bank. Do not translate it yourself: "your card has insufficient funds" is what the bank said, and a different wording can change the meaning.

If you need translated messages, choose the text by `PaymentError.code`, and show `message` when you do not know the code. That is what `code` is for, and that is why errors here are plain data, not exception classes.

`intent.amount` is stored in minor units (for example, cents). Use `formatMoney` from core or `Money` from UI to show the correct number of decimal places for each currency. See [the UI guide](./ui.md).

## Browsers {#browsers}

The packages are ESM only; there is no CommonJS build. They are published in the same JavaScript syntax they were written in, so your bundler decides how far back to compile them.

The kit itself needs very few modern browser features at runtime:

| Feature                   | Used for                 | Supported since                      |
| ------------------------- | ------------------------ | ------------------------------------ |
| `crypto.randomUUID`       | the engine's default ids | Chrome 92, Firefox 95, Safari 15.4   |
| `AbortSignal.any`         | racing an action         | Chrome 116, Firefox 124, Safari 17.4 |
| `Element.replaceChildren` | releasing a mount        | Chrome 86, Firefox 78, Safari 14     |

`AbortSignal.any` is two years newer than the others, so the engine uses it only if it exists, and otherwise uses its own listeners. A phone two versions behind can still pay. CSS container queries then set the minimum at Safari 16. `crypto.randomUUID` can be replaced: `createCheckout({ uuid: () => myOwnId() })`. It also needs a secure context (HTTPS), which a payment page has anyway.

`@property` and `@starting-style` are used where they help and ignored where they are not supported. Without them you only lose a typed CSS variable and a fade animation.

If you find something else that raises the minimum browser version, please report it as a bug.

Two browser behaviours affect real payments:

- **Blocking of third-party cookies** breaks some bank pages inside an iframe. If the bank check frame stays blank in Safari, run that step in the whole window instead: `runPendingAction({ surface: 'top' })`. The plugin does not need to change.
- **Session storage** is what survives a full-page redirect. It works in a private window. If site data is blocked completely, it does not work, and `hydrate()` returns `null`. That is why your API must also let the app read the payment by its id.

## What is not supported {#what-is-not-covered}

- **No CommonJS.** When a package is published in two formats, `instanceof` gives wrong answers between the two copies of a class, and a payment library is a bad place for that. Node 22 can `require()` ESM modules.
- **No React below 19.** The React package is small enough to rewrite for another framework: it is one `useSyncExternalStore` and one effect.
- **No translation of provider messages**, as explained above.
- **No offline mode.** A payment always needs a server.
