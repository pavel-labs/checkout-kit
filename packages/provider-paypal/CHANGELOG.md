# @checkout-kit/provider-paypal

## 0.1.1

### Patch Changes

- 90063c2: Add categorical checkout telemetry and project recovery storage to its declared fields.
  Browser actions now enforce HTTPS and origin policies; action-supplied SDK scripts and custom
  app schemes need explicit permission. HTTP on loopback hosts requires the development option.
  Adyen raw card data is disabled by default, including the component-data bypass path.

  Prepare public npm metadata and a manual provenance/OIDC publishing workflow for the exact
  archives verified by consumer tests. Document migration, integration responsibilities and
  production/account verification separately from simulator coverage.

- Updated dependencies [90063c2]
  - @checkout-kit/core@0.2.0

## 0.1.0

### Minor Changes

- c2d50e2: Add installable Stripe, Adyen and PayPal adapters with typed merchant API contracts and the shared provider conformance suite. Stripe accepts tokenized PaymentMethods, supports Stripe.js handoff and distinguishes authorization from capture. Adyen preserves complete SDK actions and binds evidence to issued actions. PayPal verifies capture state, captures only approved orders and does not offer a fictional Orders v2 void operation.

### Patch Changes

- Updated dependencies [e4cce45]
- Updated dependencies [ceac58b]
- Updated dependencies [c33ba7c]
  - @checkout-kit/core@0.1.0
