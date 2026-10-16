# Choose a reference protocol

> [Русская версия](../ru/plugins/index.md)

Six packages show common kinds of payment APIs. They work with the included fake server, so you can try them without any account keys. Use them to:

- build an adapter for your own server or provider;
- understand how extra steps (bank checks, redirects, QR codes) go through the engine;
- test without real credentials.

Stripe, Adyen and PayPal have their own ready adapters with separate guides: [Stripe](../providers/stripe.md), [Adyen](../providers/adyen.md), [PayPal](../providers/paypal.md).

## Find the protocol closest to yours {#match-your-protocol}

| Package                  | Kind of API                                                                |
| ------------------------ | -------------------------------------------------------------------------- |
| `provider-psp`           | [JSON PSP](./psp.md) — JSON API, card or saved card, 3DS2                  |
| `provider-acquiring`     | [Form acquiring](./acquiring.md) — bank API with HTML forms, 3DS1          |
| `provider-hpp`           | [Hosted page](./hosted-page.md) — payment page on the bank's site          |
| `provider-hosted-fields` | [Hosted fields](./hosted-fields.md) — card fields in the provider's iframe |
| `provider-wallet`        | [Wallet SDK](./wallet.md) — a wallet's JavaScript SDK                      |
| `provider-bank-transfer` | [Bank transfer](./bank-transfer.md) — QR code or payment code              |

The PSP and acquiring examples confirm a card. The other four collect nothing on your page: the provider's page, frame, wallet or banking app does it. If your provider's API looks like one of these, that does not mean it will work with it automatically. [The package list](../packages.md) describes all packages.

## Configure and register {#configure-and-register}

```ts
import { defineProvider } from '@checkout-kit/core'
import type { PspConfig } from '@checkout-kit/provider-psp'

const provider = defineProvider({
  id: 'psp',
  config: {
    baseUrl: '/api',
    acsOrigin: 'https://acs.yourbank.example',
    credentials: 'include',
  } satisfies PspConfig,
  load: () => import('@checkout-kit/provider-psp'),
})
```

Pass the provider, the browser runners and the storage to `createCheckout`. [The demo setup file](../../apps/demo/src/app/providers/checkout.ts) shows all six providers and the wallet adapter.

## What is the same for all of them {#what-is-the-same}

The engine always goes: create → confirm → extra step and its result → continue → final status. Only the instruments, the server routes and the kinds of steps differ.

- What comes back from a step is only linked to that step. The real payment state is on your server.
- Keep prices, the check of who owns an order, and secret keys on the server. Make idempotency and status changes atomic.
- The forms with raw card fields exist only for the simulator. In a real shop, collect payment details through your provider's own integration.

[Simulator setup](./setup.md) · [Writing a provider](../plugin-authoring.md) · [Testing](../testing.md)
