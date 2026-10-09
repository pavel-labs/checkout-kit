# @checkout-kit/conformance

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
