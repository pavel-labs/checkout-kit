# Setting up your environment

> Русская версия: [ru/plugins/setup.md](../ru/plugins/setup.md)

What to install, what to import, what to put in `.env`, and what your bundler needs to know.
Everything on this page is the same whichever plugin you use; the per-plugin pages only add
their own config object.

## Getting access to the packages

These are published **privately**, to GitHub Packages, so `npm install` on its own will not find
them. Your project needs to know where the scope lives, and needs a token to read it.

In the project's `.npmrc`:

```ini
@checkout-kit:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

A classic personal access token with **`read:packages`** is enough. Keep it in the environment,
not in the file — `.npmrc` gets committed, tokens should not.

Everything outside the `@checkout-kit` scope still comes from the public registry as usual.

## What to install

The packages are separate so you only ship what you use. Nothing here has runtime dependencies.

**A React checkout — the usual case:**

```bash
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/react @checkout-kit/ui
npm install @checkout-kit/provider-psp    # and one package per provider you support
```

**Without React** — you drive the engine yourself and render your own markup:

```bash
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-psp
```

**A native app** hosting the checkout in a WebView adds:

```bash
npm install @checkout-kit/webview-bridge
```

**Writing your own plugin** adds the test material and the contract it has to pass:

```bash
npm install --save-dev @checkout-kit/testing @checkout-kit/conformance msw vitest
```

### What each package is for

| Package                         | You need it when                                     |
| ------------------------------- | ---------------------------------------------------- |
| `@checkout-kit/core`            | always — the engine, the domain, the plugin contract |
| `@checkout-kit/runtime-browser` | in a browser — the frames, redirects and storage     |
| `@checkout-kit/react`           | you use React                                        |
| `@checkout-kit/ui`              | you want the components rather than your own         |
| `@checkout-kit/provider-*`      | one per provider you accept                          |
| `@checkout-kit/webview-bridge`  | the checkout runs inside a native app                |
| `@checkout-kit/testing`         | you want the mock backend, or the test cards         |
| `@checkout-kit/conformance`     | you are writing a plugin                             |

### Peer dependencies

Every package peers on `@checkout-kit/core`, so it is never duplicated — two copies would mean
two of every class and an `instanceof` that lies. `react` and `ui` also peer on **React 19**.
`@checkout-kit/react` additionally peers on `runtime-browser`.

`msw` is an optional peer of `@checkout-kit/testing`: the test cards import without it, and only
the mock backend needs it.

## Importing the stylesheet

One import, once, wherever your app's CSS entry is:

```ts
import '@checkout-kit/ui/styles.css'
```

Then put `ck-root` on a wrapper — or use `<CheckoutRoot>`, which also carries the theme and the
platform:

```tsx
import { CheckoutRoot } from '@checkout-kit/react'

;<CheckoutRoot theme="auto">…</CheckoutRoot>
```

**With Tailwind**, order matters. The kit lives in a `checkout` cascade layer, so import
Tailwind's parts explicitly and put the kit after preflight — which would otherwise reset the
buttons it draws — and before utilities:

```css
@layer theme, base, components, checkout, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import '@checkout-kit/ui/styles.css';
@import 'tailwindcss/utilities.css' layer(utilities);
```

## Environment variables

The kit itself reads no environment variables — it has no `process.env` or `import.meta.env` in
it at all, which `npm run purity` enforces. **What varies between your environments is config you
pass in**, so the variables are yours to name. These are the ones that actually differ.

### In the browser

| What              | Why it changes per environment                                         |
| ----------------- | ---------------------------------------------------------------------- |
| Your API base URL | `/api` in production, a tunnel or a port in development                |
| The bank's origin | your provider's sandbox ACS in development, the live one in production |

In a Vite app that is two variables. Note the `VITE_` prefix — anything without it is not
exposed to the browser, which is the behaviour you want for everything else:

```bash
# .env.development
VITE_PAYMENT_API_BASE_URL=https://localhost:4000/api
VITE_ACS_ORIGIN=https://localhost:5100
```

```ts
const psp: PspConfig = {
  baseUrl: import.meta.env.VITE_PAYMENT_API_BASE_URL ?? '/api',
  acsOrigin: import.meta.env.VITE_ACS_ORIGIN,
}
```

::: danger Never a secret key
Everything with a `VITE_` prefix is compiled into the bundle and is public. A provider's secret
key, a bank password, an API token — none of those go in the browser at any price. They live on
your server, which is the whole reason `baseUrl` points at your backend and not at the provider.
:::

### On your server

These are real secrets and belong in your server's environment only:

```bash
# .env — never committed
STRIPE_SECRET_KEY=sk_test_...
ADYEN_API_KEY=AQE...
ADYEN_MERCHANT_ACCOUNT=YourMerchantAccountTEST
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

# where the browser is, for CORS and for the return URL
CHECKOUT_ORIGIN=http://localhost:5173
CHECKOUT_RETURN_URL=http://localhost:5173/payment/return
```

There is a working example of a server that reads exactly these in
[`examples/server`](../../examples/server), with a template at
[`examples/server/.env.example`](../../examples/server/.env.example).

**Add `.env` to `.gitignore` before you write one.** Committing a `.env.example` with empty
values is the pattern; committing the real one is how keys leak.

### For local development against the mock

The demo in this repository uses one more, to turn the in-browser mock backend on:

```bash
# apps/demo/.env.mock
VITE_ENABLE_MSW=true
VITE_ACS_ORIGIN=https://localhost:5100
```

## Return URLs

Any provider that takes the whole tab — a [hosted payment page](./hosted-page.md), PayPal —
needs somewhere to come back to:

```ts
const runtime = createBrowserRuntime({ returnPath: '/payment/return' })
```

Three things about that path:

1. **It must be a real route in your app**, and that route must call `engine.hydrate()`.
2. **Build it from your base path** if the app is served from a sub-path. Hardcoding
   `/payment/return` is the mistake that works locally and breaks in production:
   ```ts
   returnPath: `${import.meta.env.BASE_URL}payment/return`
   ```
3. **Your provider probably has to be told about it.** Most keep an allowlist of return URLs;
   add every environment's.

## Bundler and TypeScript

There is usually nothing to do. The packages are ESM-only with a normal `exports` map, so a
modern bundler resolves them without help.

Two things worth knowing:

- **ESM only, deliberately.** A dual CJS/ESM build ships two copies of every module, and then
  `instanceof` starts lying. If your toolchain cannot load ESM, this kit is not for it.
- **Type-only imports still register a plugin's id.** `import type { PspConfig }` is erased at
  build time but carries the `declare module` that makes `defineProvider({ id: 'psp' })`
  type-checked. That is why the config type is imported even when the plugin itself only ever
  arrives through a dynamic `import()`.

## Server rendering

`@checkout-kit/core` has no DOM in it, and `@checkout-kit/react` reads the engine through
`useSyncExternalStore` with a server snapshot — so a component showing a phase or an amount
renders on the server fine.

Two things are browser-only and honest about it:

- **`createBrowserRuntime()`** reads `window.location`. Create the engine in a file only the
  client imports, or inside an effect.
- **`<PaymentActionHost/>`** does its work in an effect, so on the server it renders an empty
  `<div>` and starts nothing.

## Browsers

The floor is **Safari 16**, set by container queries — every layout decision in the UI kit is a
container query, because the same checkout renders full-page, in a 360px WebView, and inside a
merchant's iframe of unknown width.

The engine needs `crypto.randomUUID` (Safari 15.4) for its default ids; pass your own `uuid` to
`createCheckout` if you need to go below that. `AbortSignal.any` is used only where it exists.

## Checking it works before you have credentials

You do not need an account with anyone to run all six plugins:

```bash
npm run dev:mock   # the checkout, with the mock backend in the browser
npm run dev:bank   # the 3-D Secure simulator, on its own https origin
```

The mock backend is `@checkout-kit/testing`, and it is a real package you can point your own app
at — see [its reference](../../packages/testing/README.md). The bank simulator serves https with
a self-signed certificate, so open `https://localhost:5100/` once and accept it.
