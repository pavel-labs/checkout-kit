# Security policy

Payment security takes priority over convenience. Do not post real card data, CVC, customer
information, credentials, client secrets or full provider payloads in a public issue or PR.

Report suspected vulnerabilities privately through the repository's **Security** tab when
private vulnerability reporting is enabled. If it is unavailable, contact the repository
owner privately before disclosing an exploit. Maintainers should enable private vulnerability
reporting before the first public npm release. Include the affected package/version, a minimal
reproduction using synthetic data, the trust boundary and expected versus observed behavior.

The current code is an early release, tested with fixtures and local protocol simulators.
It has not been independently security audited or certified as a PCI-compliant application.
An installable archive or a green CI run does not establish live-provider account verification.
Use the latest release containing the relevant fix; there is no long-term support commitment
for old 0.x versions.

The merchant owns authentication/authorization, prices, durable idempotency, notification
verification, capture policy, reconciliation, fulfillment, credentials and applicable PCI scope.
The kit supplies client lifecycle, action correlation, origin/transport policies and optional UI.
See [the production guide](./docs/production.md) for those boundaries and required integration checks.

Maintainers: disclose confirmed vulnerabilities through a GitHub security advisory, identify
affected/fixed versions and release notes, and add a regression test before distributing a fix.
