# @checkout-kit/conformance

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
  - @checkout-kit/testing@0.1.1

## 0.1.0

### Minor Changes

- c33ba7c: First installable release of the headless engine, host bindings, UI and reference protocols.
  The merchant owns payment state and provider credentials. Generic protocol adapters are
  executable integration templates; named provider adapters and account verification are
  documented separately. GitHub release archives can be installed without registry credentials.

### Patch Changes

- 8b2b7a2: Preserve verified payment outcomes across repeated confirmation, resumption and cancellation. Bind reference 3-D Secure evidence to its order, validate wallet and hosted-field tokens, propagate merchant session configuration and operation-scoped idempotency keys, and exercise these guarantees in every provider's conformance suite. Allow custom merchant fixtures to reset asynchronously between conformance cases.
- Updated dependencies [e4cce45]
- Updated dependencies [ceac58b]
- Updated dependencies [c33ba7c]
- Updated dependencies [8b2b7a2]
  - @checkout-kit/core@0.1.0
  - @checkout-kit/testing@0.1.0
