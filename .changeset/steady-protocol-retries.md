---
'@checkout-kit/provider-psp': patch
'@checkout-kit/provider-acquiring': patch
'@checkout-kit/provider-hpp': patch
'@checkout-kit/provider-hosted-fields': patch
'@checkout-kit/provider-wallet': patch
'@checkout-kit/provider-bank-transfer': patch
'@checkout-kit/provider-stripe': patch
'@checkout-kit/provider-adyen': patch
'@checkout-kit/conformance': patch
'@checkout-kit/testing': patch
---

Preserve verified payment outcomes across repeated confirmation, resumption and cancellation. Bind reference 3-D Secure evidence to its order, validate wallet and hosted-field tokens, propagate merchant session configuration and operation-scoped idempotency keys, and exercise these guarantees in every provider's conformance suite. Allow custom merchant fixtures to reset asynchronously between conformance cases.
