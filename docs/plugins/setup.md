# Reference simulator environment

> [Русская версия](../ru/plugins/setup.md)

This page shows how to run the six example protocols. For Stripe, Adyen, PayPal and their official SDKs, follow [Getting started](../getting-started.md) and [merchant server](../merchant-integration.md) instead.

## Run the demo

You need Node.js 24 and npm:

```sh
npm ci
npm run dev:mock
# In another terminal:
npm run dev:bank
```

1. Open `https://localhost:5100/` once and accept the local certificate. This is the fake bank.
2. Then open the demo address that Vite printed in the terminal.

Requests to "your server" are answered by an MSW worker in the browser. The bank pages run on their own HTTPS origin. No account keys are needed. [The site demo](/demo/) includes both simulators.

Test cards:

| Card                  | Result                       |
| --------------------- | ---------------------------- |
| `4242 4242 4242 4242` | Approved.                    |
| `4000 0000 0000 0002` | Declined.                    |
| `4000 0000 0000 9995` | Insufficient funds.          |
| `4000 0025 0000 3155` | Bank check passes.           |
| `4000 0084 0000 1629` | Bank check fails.            |
| `4000 0000 0000 9979` | Processing first, then paid. |

In the payment page and wallet examples, you choose the result in the simulator instead of entering a card. [Testing](../testing.md) explains how the simulator state and recovery work.

## Install and configure {#install-and-configure}

[Install the archives together with their dependencies](../getting-started.md#install-package-archives). A web app needs core, the browser runtime and a provider. With React 19, add the React bindings and, if you like, the UI. [The package list](../packages.md) describes all packages.

Import `@checkout-kit/ui/styles.css` and wrap the checkout in `CheckoutRoot` (or an element with the `.ck-root` class). With Tailwind, keep this layer order:

```css
@layer theme, base, components, checkout, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import '@checkout-kit/ui/styles.css';
@import 'tailwindcss/utilities.css' layer(utilities);
```

Good to know:

- the packages are ESM. A config type registers the provider id for TypeScript; the dynamic import loads the code;
- core has no browser code; create the browser runtime in client code;
- the library reads only the config you pass, not environment variables;
- `VITE_` variables are public. Provider secrets stay on your server;
- point `baseUrl` at your API and use exact bank and frame origins;
- do not include the demo's fake MSW worker in a real checkout.

## Return page {#return-routes}

- If your site lives in a subfolder, include it in `returnPath`.
- Give the engine `runtime.runners`, `runtime.storage` and `runtime.returnUrl`.
- Your app must open at that path and call `hydrate` with `runtime.readReturnParams()`.
- Steps in an iframe need a place to show them (the action host on the page). The wallet needs an SDK adapter.

[Demo setup file](../../apps/demo/src/app/providers/checkout.ts) · [Runtime](../runtime.md) · [Troubleshooting](../troubleshooting.md)
