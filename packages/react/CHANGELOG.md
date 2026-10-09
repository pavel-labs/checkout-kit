# @checkout-kit/react

## 0.1.0

### Minor Changes

- c33ba7c: First installable release of the headless engine, host bindings, UI and reference protocols.
  The merchant owns payment state and provider credentials. Generic protocol adapters are
  executable integration templates; named provider adapters and account verification are
  documented separately. GitHub release archives can be installed without registry credentials.

### Patch Changes

- ceac58b: Keep payment attempts isolated across cancellation, reset, order changes and provider switches. Serialize action execution and evidence submission, reconcile processing payments on retry, and retain redirect recovery after temporary API failures. Add HTTP credential configuration and case-insensitive request headers. Require correlated messages from the rendered frame and allow chained React actions sharing a provider-assigned id.
- 20801a0: Cache object selectors safely and support custom selection equality. Settle pre-aborted displays, clean up deadline listeners, report clipboard failure and reject conflicting SDK integrity settings. Keep dialog dismissal and countdown expiry callbacks single. Validate native message envelopes and payloads, isolate sessions and frame senders, deduplicate delivery, and provide typed commands with safe injection scripts and a working native return example.
- Updated dependencies [e4cce45]
- Updated dependencies [ceac58b]
- Updated dependencies [20801a0]
- Updated dependencies [c33ba7c]
  - @checkout-kit/core@0.1.0
  - @checkout-kit/runtime-browser@0.1.0
