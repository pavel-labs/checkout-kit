# Integrate the merchant server

> [Русская версия](./ru/merchant-integration.md)

The [HTTP example](../examples/server/README.md) supplies Stripe, Adyen and PayPal boundaries. Run it locally, then replace demonstration storage and sessions with your application's order system.

## Modes and settings

`npm run dev:integration` starts local gateways and React. `npm run dev:server -w @checkout-kit/examples` calls configured test/sandbox APIs. Missing keys disable a provider; `/health` reports the mode.

| Where | Variable | Purpose |
| --- | --- | --- |
| Server | `PORT`, `CHECKOUT_HOST` | Listener, defaults 4000 and 127.0.0.1. |
| Server | `CHECKOUT_ORIGIN` | Browser origin, normally `http://localhost:5173`. |
| Server | `CHECKOUT_RETURN_URL` | Merchant return, normally `http://localhost:5173/payment/return`. |
| Server | `STRIPE_SECRET_KEY` | Stripe test secret. |
| Server | `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT` | Adyen test account. |
| Server | `ADYEN_WEBHOOK_HMAC_KEY` | Standard notification verification. |
| Server | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | PayPal sandbox app. |
| Browser | `VITE_REAL_PROVIDER_API_BASE_URL` | Merchant API, normally `http://localhost:4000`. |
| Browser | `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_ADYEN_CLIENT_KEY` | Public test keys for fields/SDK actions. |


Use the same hostname for app/API so SameSite=Lax cookies work. Browser variables are public; secrets stay on the server. Follow the selected [provider guide](./packages.md#named-provider-adapters).

## Merchant API

| Route | Responsibility |
| --- | --- |
| `/stripe/payments` | Create, confirm, read and cancel PaymentIntents. |
| `/adyen/payments/sessions` | Reserve a merchant order for the Advanced flow. |
| `/adyen/payments/:id`, `/:id/details`, `/:id/cancel` | Submit components/details, read state, request cancel. |
| `/adyen/webhooks` | Authenticate and apply notifications. |
| `/paypal/orders`, `/:id`, `/:id/capture` | Create, read and capture Orders v2. |


JSON mutations use `Idempotency-Key`. The example scopes replay by session, method and path; concurrent duplicates share a result, changed payloads return 409, and forwarded provider keys are scoped/hashed. Client amounts and return URLs are ignored.

Orders belong to a server session; another session cannot read or mutate them. The UUID cookie demonstrates isolation, not user authentication.

## Replace demonstration state

| Example | Application responsibility |
| --- | --- |
| In-memory orders | Durable price, buyer, provider reference and payment records. |
| UUID session cookie | Application login/session and CSRF policy. |
| Process-local replay | Durable scoped key, request fingerprint and atomic lock/result. |
| Local `1id` / `2id` catalog | Your authoritative product/order catalog. |
| In-memory action data | Access-controlled, bound state surviving restart/redirect. |
| Browser status reads | Server reconciliation and verified notifications after browser closure. |

Persist the decision and outcome together. Keep the operation key across ambiguous network errors. Confirmation, capture, cancel and webhook updates need atomic transitions, including concurrent processes.

## Notifications and fulfillment

Adyen notifications use the official HMAC validator, expected merchant account and amount/currency; older events are ignored. Invalid batches do not partially apply. Preserve ordering and replay history durably.

The example reads Stripe/PayPal status for the browser flow. Your app must also reconcile without a returning browser and fulfill from verified merchant state. Align capture policy with outcome mapping. A UI success event is for display/navigation.

## Verify the boundary

Test paid, declined, processing, challenge/redirect, duplicate/changed mutation, lost replies, foreign session, webhook mismatch and outage recovery. Use [fixtures/browser suites](./testing.md) and the actual sandbox account.

[Server code](../examples/server/app.ts) · [SDK gateways](../examples/server/gateways.ts) · [Recovery](./runtime.md)
