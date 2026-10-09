# Choose a reference protocol

> [Русская версия](../ru/plugins/index.md)

Six packages implement generic merchant protocols against the mock API. Use them to build an adapter for your server, study action flow or test without credentials. Named [Stripe](../providers/stripe.md), [Adyen](../providers/adyen.md), [PayPal](../providers/paypal.md) adapters have separate guides.

## Match your protocol

| Package                  | Contract                            |
| ------------------------ | ----------------------------------- |
| `provider-psp`           | [JSON PSP](./psp.md)                |
| `provider-acquiring`     | [Form acquiring](./acquiring.md)    |
| `provider-hpp`           | [Hosted page](./hosted-page.md)     |
| `provider-hosted-fields` | [Hosted fields](./hosted-fields.md) |
| `provider-wallet`        | [Wallet SDK](./wallet.md)           |
| `provider-bank-transfer` | [Bank transfer](./bank-transfer.md) |

PSP/acquiring confirm cards; hosted/wallet/transfer flows use their own collection or approval actions. A matching shape does not automatically integrate a named bank or wallet. [The catalog](../packages.md) covers all packages.

## Configure and register

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

Supply provider, browser runners and storage to createCheckout. See [the demo composition](../../apps/demo/src/app/providers/checkout.ts) for all six and the wallet adapter.

The engine runs create → confirm → action/evidence → resume → outcome. Instruments, wire endpoints and actions vary. A callback is correlated evidence; merchant state is payment truth. Keep prices, buyer ownership and credentials server-side, enforcing idempotency and transitions atomically. Raw-card forms are simulator references; collect real instruments through your selected provider's integration.

[Simulator setup](./setup.md) · [Provider authoring](../plugin-authoring.md) · [Testing](../testing.md)
