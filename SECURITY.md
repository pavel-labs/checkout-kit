# Security policy

Payment security is more important than convenience. In a public issue or pull request, never post real card data, CVC, customer information, credentials, client secrets or full provider responses.

## How to report a vulnerability

Report it **privately** through the repository's **Security** tab, if private vulnerability reporting is turned on. If it is not available, contact the repository owner privately before you publish any details.

Please include:

- the affected package and version;
- a minimal way to reproduce it, using made-up data;
- which security boundary is affected;
- what you expected and what actually happened.

Maintainers should turn on private vulnerability reporting before the first public npm release.

## Current status

This is an early release. It is tested with saved test data and local protocol simulators.

- It has **not** had an independent security audit.
- It is **not** certified as a PCI-compliant application.
- An installable archive or a green CI run does not mean it was checked with a real provider account.
- Use the latest release that contains the fix you need. Old 0.x versions get no long-term support.

## Who is responsible for what

**Your server (the merchant)** is responsible for: login and access rights, prices, reliable idempotency, checking notifications, the capture policy, reconciliation, delivering orders, keeping credentials, and your PCI scope.

**The kit** provides: the client-side payment flow, linking each step to its payment, origin and transport rules, and optional UI.

See [the production guide](./docs/production.md) for these boundaries and the checks your integration needs.

## For maintainers

Publish confirmed vulnerabilities as a GitHub security advisory. List the affected and fixed versions and the release notes, and add a regression test before you release a fix.
