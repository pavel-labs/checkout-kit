# @checkout-kit/core

## 0.2.0

### Minor Changes

- 90063c2: Add categorical checkout telemetry and project recovery storage to its declared fields.
  Browser actions now enforce HTTPS and origin policies; action-supplied SDK scripts and custom
  app schemes need explicit permission. HTTP on loopback hosts requires the development option.
  Adyen raw card data is disabled by default, including the component-data bypass path.

  Prepare public npm metadata and a manual provenance/OIDC publishing workflow for the exact
  archives verified by consumer tests. Document migration, integration responsibilities and
  production/account verification separately from simulator coverage.

## 0.1.0

### Minor Changes

- ceac58b: Keep payment attempts isolated across cancellation, reset, order changes and provider switches. Serialize action execution and evidence submission, reconcile processing payments on retry, and retain redirect recovery after temporary API failures. Add HTTP credential configuration and case-insensitive request headers. Require correlated messages from the rendered frame and allow chained React actions sharing a provider-assigned id.
- c33ba7c: First installable release of the headless engine, host bindings, UI and reference protocols.
  The merchant owns payment state and provider credentials. Generic protocol adapters are
  executable integration templates; named provider adapters and account verification are
  documented separately. GitHub release archives can be installed without registry credentials.

### Patch Changes

- e4cce45: Retain the same creation key after a lost create/prepare reply even when no intent id reached the engine. Retry the original merchant operation without creating another order; changed inputs, an explicit new key and reset still start a new attempt.
