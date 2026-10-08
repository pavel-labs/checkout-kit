# Merchant server example

A runnable reference for the server contracts used by the Stripe, Adyen and PayPal packages.
The browser sends a plan id and provider-collected instrument. This server chooses the price
(`1id`: USD 25.00, `2id`: USD 125.00), binds the order to a session, and calls the SDK.

## Local protocol simulator

From the repository root:

```bash
npm ci
npm run dev:integration
```

This starts both the server and React example. The server's `--mock` flag selects local
gateways; no provider credentials or network calls are used. `/health` reports the mode.
The mock approval pages are available only in this mode.

## Official sandbox APIs

Copy `examples/server/.env.example` to `examples/server/.env` and fill in the test keys for
providers you want to use. Missing credentials disable that provider, not the whole server.

Copy `examples/react/.env.example` to `examples/react/.env`. Vite reads that file from its
React root. Only publishable/client keys go there; secret keys belong in the server file.
Start these commands in separate terminals:

```bash
npm run dev:server -w @checkout-kit/examples
npm run dev:react -w @checkout-kit/examples
```

Open <http://localhost:5173>. Use the exact same hostname for the server and app; the reference
session cookie uses SameSite=Lax. Cross-site production APIs need an appropriate authentication,
cookie and CSRF policy. Prefer a same-origin merchant API when adapting this example.

### Stripe

Set the server's `STRIPE_SECRET_KEY=sk_test_...` and the browser's
`VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` from the same test account. The browser mounts Stripe
Elements, creates a PaymentMethod and sends its id to the merchant. The registered Stripe.js
adapter handles a `use_stripe_sdk` action. The server uses automatic capture and rereads
PaymentIntents to reconcile outcomes.

Without a publishable key, the example accepts a test PaymentMethod id (such as `pm_card_visa`)
for server testing. Configure Stripe Elements for authentication scenarios.

### Adyen

Set `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`, and browser `VITE_ADYEN_CLIENT_KEY=test_...`.
Add `http://localhost:5173` to the API credential's allowed origins in your test account.
The browser mounts Adyen Web Card fields. The instrument carries encrypted component data,
browserInfo and origin. SDK actions are mounted in an authentication dialog; it resolves
from `onAdditionalDetails`, then the provider sends details to this server.

For asynchronous methods, configure a Standard webhook pointing at `/adyen/webhooks` through
your own HTTPS tunnel and set `ADYEN_WEBHOOK_HMAC_KEY`. The receiver validates every item with
the official HMAC validator, checks the merchant account and order price, and ignores older
events. Pending/Received stay processing until an authoritative result arrives.

This example reserves a merchant order at `/payments/sessions`; it uses Adyen's Advanced
`/payments` flow, not Adyen's Sessions flow. `paymentData` is retained on the merchant order
and bound to details submission. Cancellation acknowledgement stays pending until a webhook.

### PayPal

Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` for a sandbox app. The provider opens the
order's approval URL, reads it after returning, and captures only an approved order. Already
completed orders are not captured again. The server checks the capture status, currency and
full order amount; an order marked COMPLETED with a pending capture is still processing.

## HTTP boundary

| Route                                                          | Operation                                |
| -------------------------------------------------------------- | ---------------------------------------- |
| `POST /stripe/payments`                                        | Create a priced PaymentIntent            |
| `POST /stripe/payments/:id/confirm`                            | Confirm a PaymentMethod id               |
| `GET /stripe/payments/:id`, `POST /stripe/payments/:id/cancel` | Reconcile or cancel                      |
| `POST /adyen/payments/sessions`                                | Reserve a merchant order                 |
| `POST /adyen/payments/:id`, `POST /adyen/payments/:id/details` | Payments or additional details           |
| `GET /adyen/payments/:id`, `POST /adyen/payments/:id/cancel`   | Merchant state or cancellation           |
| `POST /adyen/webhooks`                                         | HMAC-verified asynchronous state updates |
| `POST /paypal/orders`                                          | Create a priced order                    |
| `GET /paypal/orders/:id`, `POST /paypal/orders/:id/capture`    | Reconcile or capture                     |

Mutations require JSON and an Idempotency-Key. Replay keys are scoped to session, method
and path; concurrent duplicates share a result, changed parameters return 409, and provider
keys are hashed/scoped before forwarding. Browser amounts and return URLs are ignored.
Other sessions cannot read or mutate an order. CORS is restricted to the configured origin.
Errors hide provider credentials and raw SDK responses.

## Adapting it for a merchant

`app.ts` owns HTTP and order/replay state; `gateways.ts` owns official SDK calls; `mock.ts`
is the separate simulator. Store order ownership, provider ids, action data and idempotent
results in your database, with atomic operation locks and a verified authenticated buyer.
The UUID cookie here demonstrates isolation; it is not your application's login system.
In-memory orders disappear on restart, and replay protection is not shared across processes.

Use authenticated routes, durable signed webhook ingestion, provider-specific fulfillment,
monitoring and your application's order lifecycle. Stripe/PayPal status reads work without
webhooks for this checkout example; fulfillment after a closed browser still needs server-side
reconciliation. Test the configured provider accounts end to end before accepting payments.

```bash
npx vitest run --project merchant-server
npm run test:integration
```
