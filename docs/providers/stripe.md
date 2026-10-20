# Stripe

> [Русская версия](../ru/providers/stripe.md)

This adapter works with Stripe PaymentIntents through **your** server. The card is collected by Stripe.js (Stripe's own fields), which gives you a PaymentMethod id. You pass only that id. Raw card data never goes through this adapter.

## Install from npm

```sh
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-stripe @stripe/stripe-js
```

[npm package](https://www.npmjs.com/package/@checkout-kit/provider-stripe) · [All installation options](../getting-started.md#install-from-npm)

```ts
import { defineProvider } from '@checkout-kit/core'
import type { StripeConfig } from '@checkout-kit/provider-stripe'

const registration = defineProvider({
  id: 'stripe',
  config: { baseUrl: '/api/stripe' } satisfies StripeConfig,
  load: () => import('@checkout-kit/provider-stripe'),
})

// After Stripe.js creates the PaymentMethod:
await checkout.pay({
  input: { planId: 'starter' },
  instrument: { kind: 'token', token: paymentMethod.id },
})
```

## What your server must do {#what-your-server-must-do}

Your server owns the prices, checks who the buyer is, and keeps the Stripe secret key. Return only the fields of `StripePaymentIntent`, and link every payment to the logged-in buyer.

| Your route                                              | What it does at Stripe                                    |
| ------------------------------------------------------- | --------------------------------------------------------- |
| `POST /payments` with `{ planId }`                      | Creates a PaymentIntent. The amount is set by the server. |
| `POST /payments/:id/confirm` with `{ paymentMethodId }` | Confirms that payment.                                    |
| `GET /payments/:id`                                     | Reads its current status.                                 |
| `POST /payments/:id/cancel`                             | Cancels the payment, if it can still be canceled.         |

The adapter makes the `Idempotency-Key` different for each operation, so that create, confirm and cancel do not clash at Stripe. Forward this header to Stripe, and keep it the same when you retry the same request.

## Extra steps {#extra-steps}

A `redirect_to_url` step is passed on as it is. For `use_stripe_sdk` (for example, 3D Secure inside Stripe.js), register an SDK adapter in the runtime:

```ts
import { loadStripe } from '@stripe/stripe-js'
import { createStripeSdkAdapter } from '@checkout-kit/provider-stripe'

const stripe = loadStripe(publishableKey)
const adapter = createStripeSdkAdapter(async () => {
  const client = await stripe
  if (!client) throw new Error('Stripe.js could not be loaded.')
  return client
})
// createBrowserRuntime({ returnPath: '/payment/return', sdk: { adapters: [adapter] } })
```

- What the SDK reports and what comes back in the return address are only hints. Before reporting a result, the adapter reads your API.
- The client secret is given only to the step. It is never saved in the payment data or in the recovery storage. Do not write it to logs.

## Capture {#capture}

Use automatic capture. If Stripe says `requires_capture`, the adapter reports `capture_required` and the payment stays "processing" — it is never reported as success. If you want manual capture, implement capture and order delivery on your server.

## Testing {#testing}

The contract tests and the request/response format tests run without any keys. Before accepting payments, you still have to test with your own Stripe sandbox account. See [the integration examples](https://github.com/pavel-labs/checkout-kit/blob/main/examples/README.md).

## Card fields and server response {#runnable-fields-and-merchant-dto}

Put your **test** keys into the server variable `STRIPE_SECRET_KEY` and the browser variable `VITE_STRIPE_PUBLISHABLE_KEY`. [StripeFields.tsx](../../examples/react/StripeFields.tsx) collects a PaymentMethod with Stripe Elements and provides the SDK adapter. Give the engine the runners and session storage; the [React guide](../react.md) shows a complete page.

Your server returns a [StripePaymentIntent](../../packages/provider-stripe/src/provider.ts) with: id, amount as an integer, currency, status, a safe error and `next_action`. The client secret belongs only to the bank check step.

How statuses are understood:

- `succeeded` — paid;
- `processing` — the engine keeps checking the status;
- `requires_capture` — the result stays unclear until you capture;
- a decline keeps the bank's own text;
- unsupported steps fail with a clear error.

Read the payment before you change it; a cancel cannot overwrite a success. With your sandbox account, check bank checks, redirects and lost replies, and reconcile payments when the browser was closed.

[Merchant server](../merchant-integration.md) · [Recovery](../runtime.md) · [Stripe PaymentIntents](https://docs.stripe.com/payments/payment-intents)
