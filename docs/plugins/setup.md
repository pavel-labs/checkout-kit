# Reference simulator environment

> [Русская версия](../ru/plugins/setup.md)

This page runs the six generic protocols. For named adapters and official SDKs, follow [Getting started](../getting-started.md) and [merchant integration](../merchant-integration.md).

## Run the demo

Use Node.js 24 and npm:

```sh
npm ci
npm run dev:mock
# In another terminal:
npm run dev:bank
```

Open `https://localhost:5100/` once and accept the local certificate, then open Vite's printed demo URL. The MSW worker handles merchant requests; bank pages use their own HTTPS origin. No account keys are needed. [The site demo](/demo/) includes both simulators.

| Card                  | Outcome                      |
| --------------------- | ---------------------------- |
| `4242 4242 4242 4242` | Approved.                    |
| `4000 0000 0000 0002` | Declined.                    |
| `4000 0000 0000 9995` | Insufficient funds.          |
| `4000 0025 0000 3155` | Challenge passes.            |
| `4000 0084 0000 1629` | Challenge fails.             |
| `4000 0000 0000 9979` | Processing, then settlement. |

Hosted/wallet flows select their outcome in the simulator rather than submit raw card fields. [Testing](../testing.md) describes state and recovery.

## Install and configure

[Install archives and peers](../getting-started.md#install-package-archives) together. Web needs core, runtime and a provider; React 19 adds bindings and optional UI. [The catalog](../packages.md) covers all packages.

Import `@checkout-kit/ui/styles.css` and use CheckoutRoot / .ck-root. With Tailwind:

```css
@layer theme, base, components, checkout, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import '@checkout-kit/ui/styles.css';
@import 'tailwindcss/utilities.css' layer(utilities);
```

Packages are ESM. Config types register ids; dynamic imports load implementations. Core has no DOM; instantiate browser runtime in client code. The library reads passed config, not environment variables. VITE_ variables are public; provider secrets stay on your server. Point baseUrl at your API and use exact bank/frame origins. Leave the demo's mock worker out of a real merchant checkout.

## Return routes

Include your deployed base in returnPath. Give engine runtime.runners, runtime.storage and runtime.returnUrl. Serve the app on that path and call hydrate with runtime.readReturnParams. Iframes need a mounted action host; wallet needs an SDK adapter.

[Composition root](../../apps/demo/src/app/providers/checkout.ts) · [Runtime](../runtime.md) · [Troubleshooting](../troubleshooting.md)
