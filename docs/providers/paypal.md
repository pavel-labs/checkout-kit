# PayPal

> [Русская версия](../ru/providers/paypal.md)

This adapter works with PayPal Orders v2. The shopper approves the payment on PayPal's page, and then **your server** captures the money. The fact that the shopper came back to your page does not prove the payment.

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

Nothing is collected on your page, so the instrument is `{ kind: 'none' }`.

## What your server must do {#what-your-server-must-do}

| Your route                              | What it does                                                           |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `POST /paypal/orders` with `{ planId }` | Creates an order with the server's price and `intent: CAPTURE`.        |
| `GET /paypal/orders/:id`                | Reads the order and the state of its capture.                          |
| `POST /paypal/orders/:id/capture`       | Captures an approved order. On retry, sends the same request id again. |

Return a `PayPalOrder`:

- `approveUrl` is the `payer-action` / `approve` link from PayPal;
- `captureStatus` is taken from `purchase_units[].payments.captures[]`. If there are several captures, the server must check that together they cover the expected amount and currency;
- an order marked `COMPLETED` whose capture is pending, declined or missing is **never** reported as paid.

## How the adapter protects the payment {#how-the-adapter-protects-the-payment}

- Before capture, it reads the order again and captures only if the order is `APPROVED`.
- It does not capture an order that is already completed.
- A return token that belongs to another order is rejected. Your server must also check that the order belongs to this buyer.
- Create and capture use **different** idempotency keys. Forward them to PayPal as `PayPal-Request-Id`.
- There is no fake "cancel" API: an approval in Orders v2 is not a reservation that can be voided. Canceling the checkout only stops the flow in the browser; the real payment state is on your server.

## Setup and testing {#merchant-dto-and-recovery}

Set the server variables `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` from a PayPal sandbox app. This integration needs no browser SDK. It uses a full-page redirect and the runtime's session storage. The [React guide](../react.md) shows how the order is restored after the return.

Your server returns a [PayPalOrder](../../packages/provider-paypal/src/provider.ts): id, amount as an integer, currency, status, `approveUrl`, `captureStatus`.

How statuses are understood:

- `APPROVED` — capture is allowed;
- capture completed — success;
- capture pending — "processing";
- no capture data — `capture_unverified`.

Check on the server that the capture belongs to the order and that the total amount and currency are right. Read the order before capture and after a lost reply.

The contract tests use saved test data. Before accepting payments, check approval, capture and pending capture with your own sandbox account. See [the integration examples](https://github.com/pavel-labs/checkout-kit/blob/main/examples/README.md).

[Merchant server](../merchant-integration.md) · [Recovery](../runtime.md) · [PayPal Orders v2](https://developer.paypal.com/api/orders/v2)
