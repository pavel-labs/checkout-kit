# @checkout-kit/core

The payment engine of checkout kit. It runs a payment step by step, keeps a list of providers, stores the current state, and contains the payment types (payment, instrument, step, step result), recovery and HTTP helpers.

It has no browser code, no React and nothing tied to a specific bundler, so it works in a browser, in Node and in a worker. New to the words used here? See the [glossary](https://pavel-labs.github.io/checkout-kit/glossary.html).

## Run a checkout

```ts
import { createCheckout, createRunnerRegistry, defineProvider } from '@checkout-kit/core'
import type { StripeConfig } from '@checkout-kit/provider-stripe'

const engine = createCheckout({
  providers: [
    defineProvider({
      id: 'stripe',
      config: { baseUrl: 'https://merchant.example.com/stripe' } satisfies StripeConfig,
      load: () => import('@checkout-kit/provider-stripe'),
    }),
  ],
  runners: createRunnerRegistry(),
  returnUrl: 'https://merchant.example.com/checkout/return',
  defaultProviderId: 'stripe',
})
const result = await engine.pay({
  input: { planId: 'starter' },
  instrument: { kind: 'token', token: 'paymentmethod-from-stripe-js' },
})
```

This code handles payments that finish right away. For extra steps (redirects, provider SDKs, QR codes), register runners. The easiest way is `@checkout-kit/runtime-browser`: it gives you ready runners and session storage. Your server is responsible for logging in buyers, prices and the real payment status.

| Import                        | What is inside                                                               |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `@checkout-kit/core`          | The engine, the provider list, the state store, contracts and helpers.       |
| `@checkout-kit/core/engine`   | Running the payment, events, phases, saving state, the runner list.          |
| `@checkout-kit/core/domain`   | Payments, instruments, steps, step results, results, money and card helpers. |
| `@checkout-kit/core/provider` | The contracts a provider plugin implements, and its capabilities.            |
| `@checkout-kit/core/http`     | Request encoding, headers and cookies, cancel, structured HTTP errors.       |

## How it behaves

- **`pay` stops at an extra step.** Your app then calls `runPendingAction` or `resumeWith`.
- **Processing** payments are checked again automatically (polling).
- **`hydrate`** restores the saved ids after a redirect and reads the order from the server again.
- **Retry after a lost reply** keeps the same idempotency key, even if no payment id came back.
- **`abort`** asks the provider to cancel, if it can, and keeps a confirmed success as success.
- **`reset`** clears only the local state. It does not cancel or refund a charge.
- **Errors**: `confirm` and `resume` return errors as data; the engine also catches exceptions from third-party plugin code.

Your server must still make operations atomic, check who owns each order, set prices and deliver orders.

[Getting started](https://pavel-labs.github.io/checkout-kit/getting-started.html) · [Recovery](https://pavel-labs.github.io/checkout-kit/runtime.html)
