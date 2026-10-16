# Merchant server example

A working example of the server that the Stripe, Adyen and PayPal packages expect.

How it works:

1. The browser sends a plan id and the payment instrument collected by the provider's own fields.
2. The server sets the price itself (`1id`: USD 25.00, `2id`: USD 125.00).
3. It links the order to the current session.
4. It calls the provider's SDK.

## Local simulator (no keys)

From the repository root:

```bash
npm ci
npm run dev:integration
```

This starts the server and the React example together. The server's `--mock` flag turns on local fake providers: no provider keys and no network calls are used. The `/health` address shows which mode is running. The fake approval pages exist only in this mode.

## Real sandbox APIs

1. Copy `examples/server/.env.example` to `examples/server/.env` and fill in the test keys of the providers you want to use. A provider without keys is turned off; the rest of the server still works.
2. Copy `examples/react/.env.example` to `examples/react/.env`. Vite reads this file from the React folder. Put only public (publishable / client) keys there. Secret keys go only into the server file.
3. Run these commands in two separate terminals:

```bash
npm run dev:server -w @checkout-kit/examples
npm run dev:react -w @checkout-kit/examples
```

Open <http://localhost:5173>. Use exactly the same host name for the server and the app: the example's session cookie uses `SameSite=Lax`, so it is not sent between different sites. If your production API is on another site, you need a proper login, cookie and CSRF setup. When you adapt this example, it is easier to keep the API on the same origin as the app.

### Stripe

- Server: `STRIPE_SECRET_KEY=sk_test_...`. Browser: `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`. Both from the same test account.
- The browser shows Stripe Elements, creates a PaymentMethod and sends its id to the server.
- The registered Stripe.js adapter handles the `use_stripe_sdk` step.
- The server uses automatic capture and reads the PaymentIntent again to get the final result.

Without a publishable key, the example accepts a test PaymentMethod id (such as `pm_card_visa`), so you can test the server alone. For bank check scenarios, set up Stripe Elements.

### Adyen

- Set `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`, and in the browser `VITE_ADYEN_CLIENT_KEY=test_...`.
- In your Adyen test account, add `http://localhost:5173` to the allowed origins of the API credential.
- The browser shows Adyen Web card fields. The instrument contains the encrypted component data, `browserInfo` and `origin`.
- SDK steps are shown in a bank check dialog. It finishes from `onAdditionalDetails`, and then the provider sends the details to this server.

**Webhooks.** For payment methods that finish later, set up a Standard webhook to `/adyen/webhooks` through your own HTTPS tunnel, and set `ADYEN_WEBHOOK_HMAC_KEY`. The receiver checks every item with the official HMAC validator, checks the merchant account and the order price, and ignores older events. `Pending` and `Received` stay "processing" until a final result arrives.

This example reserves an order on your side at `/payments/sessions`. It uses Adyen's Advanced `/payments` flow, **not** Adyen's Sessions flow. `paymentData` is kept with the order on the server and linked to the details request. A cancel request stays pending until the webhook confirms it.

### PayPal

- Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from a PayPal sandbox app.
- The provider opens the order's approval page, reads the order after the shopper returns, and captures only an approved order.
- Orders that are already completed are not captured again.
- The server checks the capture status, the currency and the full order amount. An order marked `COMPLETED` with a pending capture is still "processing".

## Server routes

| Route                                                          | What it does                                   |
| -------------------------------------------------------------- | ---------------------------------------------- |
| `POST /stripe/payments`                                        | Create a PaymentIntent with the server's price |
| `POST /stripe/payments/:id/confirm`                            | Confirm with a PaymentMethod id                |
| `GET /stripe/payments/:id`, `POST /stripe/payments/:id/cancel` | Read the real status, or cancel                |
| `POST /adyen/payments/sessions`                                | Reserve an order                               |
| `POST /adyen/payments/:id`, `POST /adyen/payments/:id/details` | Send the payment, or extra details             |
| `GET /adyen/payments/:id`, `POST /adyen/payments/:id/cancel`   | Read the state, or cancel                      |
| `POST /adyen/webhooks`                                         | Status updates, checked with HMAC              |
| `POST /paypal/orders`                                          | Create an order with the server's price        |
| `GET /paypal/orders/:id`, `POST /paypal/orders/:id/capture`    | Read the real status, or capture               |

Rules the server follows:

- requests that change data must be JSON and carry an `Idempotency-Key`;
- repeat protection is per session, method and path. Two identical requests at the same time get the same result. The same key with different data gets `409`. Keys sent on to the provider are hashed and tied to the session;
- amounts and return addresses from the browser are ignored;
- other sessions cannot read or change an order;
- CORS allows only the configured origin;
- errors never show provider keys or raw SDK responses.

## Using it for a real shop

How the code is split:

- `app.ts` — HTTP, orders and repeat protection;
- `gateways.ts` — calls to the official provider SDKs;
- `mock.ts` — the separate simulator.

What you need to change:

- store order owners, provider ids, step data and idempotency results **in a database**, with atomic locks and a really logged-in buyer;
- the UUID cookie here only shows how sessions are kept apart. It is **not** a login system;
- orders in memory disappear on restart, and repeat protection is not shared between several server processes.

Also add: login on the routes, reliable storage of signed webhooks, order delivery for each provider, monitoring and your own order lifecycle. In this example, Stripe and PayPal status checks work without webhooks. But to deliver an order after the shopper closed the browser, your server still has to reconcile payments on its own. Test your real provider accounts from start to finish before accepting payments.

```bash
npx vitest run --project merchant-server
npm run test:integration
```
