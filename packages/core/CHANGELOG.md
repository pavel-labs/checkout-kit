# @checkout-kit/core

## 0.1.0

### Minor Changes

- ceac58b: Keep payment attempts isolated across cancellation, reset, order changes and provider switches. Serialize action execution and evidence submission, reconcile processing payments on retry, and retain redirect recovery after temporary API failures. Add HTTP credential configuration and case-insensitive request headers. Require correlated messages from the rendered frame and allow chained React actions sharing a provider-assigned id.
- c33ba7c: First installable release of the headless engine, host bindings, UI and reference protocols.
  The merchant owns payment state and provider credentials. Generic protocol adapters are
  executable integration templates; named provider adapters and account verification are
  documented separately. GitHub release archives can be installed without registry credentials.

### Patch Changes

- e4cce45: Retain the same creation key after a lost create/prepare reply even when no intent id reached the engine. Retry the original merchant operation without creating another order; changed inputs, an explicit new key and reset still start a new attempt.
