# @checkout-kit/core

Headless lifecycle, provider registry, immutable store, payment/action/evidence types, recovery and HTTP helpers. No DOM, React or bundler environment.

## Run a checkout

~~~ts
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
~~~

This handles immediate outcomes; register action runners for redirect/SDK/display. Browser runtime assembles runners and session storage. The merchant API owns authenticated buyers, prices and payment truth.

| Entry point | Contents |
| --- | --- |
| `@checkout-kit/core` | Engine, registry, store, contracts and helpers. |
| `@checkout-kit/core/engine` | Orchestration, events, phases, persistence and runner registry. |
| `@checkout-kit/core/domain` | Intents, instruments, actions, evidence, results, money/card helpers. |
| `@checkout-kit/core/provider` | Provider/context/capability contracts. |
| `@checkout-kit/core/http` | Encoding, headers/cookies, abort and structured HTTP errors. |

Pay stops at a pending action; the host calls runPendingAction or resumeWith. Processing polls. Hydrate restores saved metadata and re-reads the order. Retry keeps the same key after a lost create/confirm reply, even without a returned id.

Abort requests supported cancellation and preserves verified success. Reset clears local state; it does not cancel/refund a charge. Confirm/resume return error data; the engine also catches third-party exceptions. Server atomicity, ownership, prices and fulfillment remain merchant responsibilities.

[Getting started](https://pavel-labs.github.io/checkout-kit/getting-started.html) · [Recovery](https://pavel-labs.github.io/checkout-kit/runtime.html)
