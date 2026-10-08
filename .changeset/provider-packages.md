---
'@checkout-kit/provider-stripe': minor
'@checkout-kit/provider-adyen': minor
'@checkout-kit/provider-paypal': minor
---

Add installable Stripe, Adyen and PayPal adapters with typed merchant API contracts and the shared provider conformance suite. Stripe accepts tokenized PaymentMethods, supports Stripe.js handoff and distinguishes authorization from capture. Adyen preserves complete SDK actions and binds evidence to issued actions. PayPal verifies capture state, captures only approved orders and does not offer a fictional Orders v2 void operation.
