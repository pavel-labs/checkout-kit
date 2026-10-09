# @checkout-kit/provider-paypal

PayPal Orders v2 with approval on PayPal's page and capture on your merchant server.
The shopper returning to your page is not proof of payment.

```ts
import { defineProvider } from '@checkout-kit/core'
import type { PayPalConfig } from '@checkout-kit/provider-paypal'

const registration = defineProvider({
  id: 'paypal',
  config: { baseUrl: '/api' } satisfies PayPalConfig,
  load: () => import('@checkout-kit/provider-paypal'),
})

await checkout.pay({ input: { planId: 'starter' }, instrument: { kind: 'none' } })
```

| Merchant endpoint                       | Operation                                                         |
| --------------------------------------- | ----------------------------------------------------------------- |
| `POST /paypal/orders` with `{ planId }` | Create an order with server-owned price and `intent: CAPTURE`     |
| `GET /paypal/orders/:id`                | Retrieve the order and its capture state                          |
| `POST /paypal/orders/:id/capture`       | Capture an approved order, replaying the same request id on retry |

Return `PayPalOrder`. `approveUrl` is the `payer-action`/`approve` link. `captureStatus` is
derived from `purchase_units[].payments.captures[]`; for multiple captures the server must
verify that they cover the expected amount and currency. An order marked `COMPLETED` with a
pending, declined or missing capture is never reported as paid.

The adapter rereads the order before capture, captures only `APPROVED`, and does not capture
an already completed order again. A return token for another order is rejected. The server
must verify buyer ownership as well.

Create and capture use separate idempotency keys. Forward them as `PayPal-Request-Id`.
The adapter does not offer a fake cancellation API: Orders v2 approval is not an
authorization that can be voided. Checkout cancellation stops the local flow; actual payment
state is owned by the server.

The contract tests use fixtures. Verify your merchant's sandbox approval, capture and
pending-capture behavior before accepting payments. See [the integration examples](../../examples/README.md).
