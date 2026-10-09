---
'@checkout-kit/core': minor
'@checkout-kit/runtime-browser': patch
'@checkout-kit/react': patch
---

Keep payment attempts isolated across cancellation, reset, order changes and provider switches. Serialize action execution and evidence submission, reconcile processing payments on retry, and retain redirect recovery after temporary API failures. Add HTTP credential configuration and case-insensitive request headers. Require correlated messages from the rendered frame and allow chained React actions sharing a provider-assigned id.
