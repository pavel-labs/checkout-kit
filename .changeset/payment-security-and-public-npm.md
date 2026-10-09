---
'@checkout-kit/core': minor
'@checkout-kit/runtime-browser': minor
'@checkout-kit/provider-adyen': minor
'@checkout-kit/conformance': patch
'@checkout-kit/provider-acquiring': patch
'@checkout-kit/provider-bank-transfer': patch
'@checkout-kit/provider-hosted-fields': patch
'@checkout-kit/provider-hpp': patch
'@checkout-kit/provider-paypal': patch
'@checkout-kit/provider-psp': patch
'@checkout-kit/provider-stripe': patch
'@checkout-kit/provider-wallet': patch
'@checkout-kit/react': patch
'@checkout-kit/testing': patch
'@checkout-kit/ui': patch
'@checkout-kit/webview-bridge': patch
---

Add categorical checkout telemetry and project recovery storage to its declared fields.
Browser actions now enforce HTTPS and origin policies; action-supplied SDK scripts and custom
app schemes need explicit permission. HTTP on loopback hosts requires the development option.
Adyen raw card data is disabled by default, including the component-data bypass path.

Prepare public npm metadata and a manual provenance/OIDC publishing workflow for the exact
archives verified by consumer tests. Document migration, integration responsibilities and
production/account verification separately from simulator coverage.
