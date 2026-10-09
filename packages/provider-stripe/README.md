# @checkout-kit/provider-stripe

Stripe PaymentIntents through your merchant API, using PaymentMethod ids collected with
Stripe.js. Raw card data never goes through this adapter.

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

The merchant owns prices, authorization and the Stripe secret key. Return only the fields
in `StripePaymentIntent`; associate every intent with its authenticated buyer.

| Merchant endpoint                                       | Stripe operation                                  |
| ------------------------------------------------------- | ------------------------------------------------- |
| `POST /payments` with `{ planId }`                      | Create a PaymentIntent with a server-owned amount |
| `POST /payments/:id/confirm` with `{ paymentMethodId }` | Confirm that intent                               |
| `GET /payments/:id`                                     | Retrieve its current status                       |
| `POST /payments/:id/cancel`                             | Cancel a cancelable intent                        |

The adapter scopes `Idempotency-Key` by operation so create, confirm and cancel do not
collide in Stripe. Forward the header; retain it when retrying the same request.

`redirect_to_url` is preserved unchanged. For `use_stripe_sdk`, register a runtime adapter:

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

The SDK callback and return URL are hints; the adapter reads your API before reporting an
outcome. Client secrets are passed only to the action, never into the intent or redirect
recovery storage. Do not log them.

Use automatic capture. `requires_capture` reports `capture_required` with a processing
intent, never success. For manual capture, implement capture and fulfillment on your backend.

The contract and wire-format tests run without credentials. A sandbox run against your own
Stripe account is still required before accepting payments. See [the integration examples](../../examples/README.md).
