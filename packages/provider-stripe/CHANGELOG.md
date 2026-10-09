# @checkout-kit/provider-stripe

## 0.1.0

### Minor Changes

- c2d50e2: Add installable Stripe, Adyen and PayPal adapters with typed merchant API contracts and the shared provider conformance suite. Stripe accepts tokenized PaymentMethods, supports Stripe.js handoff and distinguishes authorization from capture. Adyen preserves complete SDK actions and binds evidence to issued actions. PayPal verifies capture state, captures only approved orders and does not offer a fictional Orders v2 void operation.

### Patch Changes

- 8b2b7a2: Preserve verified payment outcomes across repeated confirmation, resumption and cancellation. Bind reference 3-D Secure evidence to its order, validate wallet and hosted-field tokens, propagate merchant session configuration and operation-scoped idempotency keys, and exercise these guarantees in every provider's conformance suite. Allow custom merchant fixtures to reset asynchronously between conformance cases.
- Updated dependencies [e4cce45]
- Updated dependencies [ceac58b]
- Updated dependencies [c33ba7c]
  - @checkout-kit/core@0.1.0
