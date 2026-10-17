# Integrate the merchant server

> [Русская версия](./ru/merchant-integration.md)

The [example HTTP server](../examples/server/README.md) already has routes for Stripe, Adyen and PayPal. Run it locally first. Then, for a real shop, replace its in-memory storage and simple sessions with your own order system and login.

## Modes and settings

There are two ways to run it:

- `npm run dev:integration` starts the server with local fake providers, plus the React app;
- `npm run dev:server -w @checkout-kit/examples` calls the real test (sandbox) APIs of the providers whose keys you set.

If a provider has no keys, it is turned off. The `/health` address shows which mode is running.

| Where   | Variable                                               | What it is                                                                    |
| ------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Server  | `PORT`, `CHECKOUT_HOST`                                | Port and address to listen on. Default: 4000 and 127.0.0.1.                   |
| Server  | `CHECKOUT_ORIGIN`                                      | Address of the web app, usually `http://localhost:5173`.                      |
| Server  | `CHECKOUT_RETURN_URL`                                  | Return page after a redirect, usually `http://localhost:5173/payment/return`. |
| Server  | `STRIPE_SECRET_KEY`                                    | Stripe test secret key.                                                       |
| Server  | `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`              | Adyen test account.                                                           |
| Server  | `ADYEN_WEBHOOK_HMAC_KEY`                               | Key to check that Adyen notifications are real.                               |
| Server  | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`             | PayPal sandbox app.                                                           |
| Browser | `VITE_REAL_PROVIDER_API_BASE_URL`                      | Address of your server API, usually `http://localhost:4000`.                  |
| Browser | `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_ADYEN_CLIENT_KEY` | Public test keys for card fields and SDK steps.                               |

Open the app and the API on the same host name. Otherwise the browser will not send the login cookie (because of `SameSite=Lax`). Browser variables are visible to everyone; secret keys must stay on the server. Then follow the [guide for your provider](./packages.md#named-provider-adapters).

## Server routes {#merchant-api}

| Route                                                | What it does                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `/stripe/payments`                                   | Create, confirm, read and cancel Stripe PaymentIntents.            |
| `/adyen/payments/sessions`                           | Reserve an order for the Adyen Advanced flow.                      |
| `/adyen/payments/:id`, `/:id/details`, `/:id/cancel` | Send component data and extra details, read status, ask to cancel. |
| `/adyen/webhooks`                                    | Check and apply Adyen notifications.                               |
| `/paypal/orders`, `/:id`, `/:id/capture`             | Create, read and capture PayPal orders (Orders v2).                |

**Protection against repeated requests.** Every JSON request that changes data carries an `Idempotency-Key` header. The example stores the result per session, method and path:

- if two identical requests arrive at the same time, both get the same result;
- if a request with the same key but different data arrives, the server answers 409;
- keys forwarded to the provider are tied to the session and hashed.

The server ignores any amount or return address sent by the browser. It uses only its own values.

**Isolation.** An order belongs to one server session. Another session cannot read or change it. The example uses a cookie with a random UUID for this. It only shows the separation; it is **not** a real user login.

## What to replace in a real shop {#replace-demonstration-state}

| In the example                 | In your application                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Orders in memory               | A database with the price, buyer, provider payment id and payment records.              |
| UUID session cookie            | Your real login, sessions and CSRF protection.                                          |
| Repeat protection in memory    | A stored key, a fingerprint of the request and an atomic lock with the saved result.    |
| Local catalog `1id` / `2id`    | Your real product and order catalog.                                                    |
| Step data in memory            | Stored data with access control, which survives a restart and a redirect.               |
| Status checks from the browser | Server-side reconciliation and checked notifications, even after the browser is closed. |

Save the decision and its result together, in one operation. If the network fails and you do not know whether the operation went through, keep the same operation key. Confirmation, capture, cancel and webhook updates must change the state atomically, even when several server processes run at the same time.

## Notifications and order delivery {#notifications-and-fulfillment}

For Adyen notifications, the example:

- checks the signature with the official HMAC validator;
- checks the merchant account, amount and currency;
- ignores older events;
- rejects a whole batch if one item is invalid (nothing is applied partially).

In your app, keep the order of events and the history of repeats in a database.

For Stripe and PayPal, the example reads the status when the browser asks. Your app must also check payments **without** the browser (the shopper may never come back), and deliver the order only from the confirmed status on the server. Make the capture policy match how you map results. A "success" event in the UI is only for showing a message or moving to the next page.

## Check your server {#verify-the-boundary}

Test these cases: paid, declined, processing, extra check / redirect, repeated and changed request, lost reply, another user's session, wrong webhook data, recovery after an outage. Use the [test data and browser tests](./testing.md), and your real sandbox account.

[Server code](../examples/server/app.ts) · [Provider SDK calls](../examples/server/gateways.ts) · [Recovery](./runtime.md)
