# @checkout-kit/ui

## 0.2.1

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

## 0.2.0

### Minor Changes

- 5c29d7e: Refine the checkout design system with neutral light/dark surfaces, readable typography,
  pill actions, consistent button states, visible control borders and composed payment screens.
  Add accessible IconButton and InputGroup components, a localized Dialog close button and
  description, and opt-outs for focus/live announcements in static result specimens. Derive
  interactive colors from custom accents and prevent busy or aria-disabled buttons from
  submitting a native form. The live gallery now includes a responsive checkout preview.

## 0.1.0

### Minor Changes

- c33ba7c: First installable release of the headless engine, host bindings, UI and reference protocols.
  The merchant owns payment state and provider credentials. Generic protocol adapters are
  executable integration templates; named provider adapters and account verification are
  documented separately. GitHub release archives can be installed without registry credentials.

### Patch Changes

- 20801a0: Cache object selectors safely and support custom selection equality. Settle pre-aborted displays, clean up deadline listeners, report clipboard failure and reject conflicting SDK integrity settings. Keep dialog dismissal and countdown expiry callbacks single. Validate native message envelopes and payloads, isolate sessions and frame senders, deduplicate delivery, and provide typed commands with safe injection scripts and a working native return example.
- Updated dependencies [e4cce45]
- Updated dependencies [ceac58b]
- Updated dependencies [c33ba7c]
  - @checkout-kit/core@0.1.0
