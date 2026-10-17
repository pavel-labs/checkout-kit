# The backend a plugin talks to

> Русская версия: [ru/backend.md](./ru/backend.md)

[Merchant server](./merchant-integration.md) describes the ready routes, sessions, idempotency and notification checks of the example server. This page explains the general idea.

The plugin in the browser calls **your** server API, and your server calls the payment provider. The [example server](../examples/server/README.md) has routes for Stripe, Adyen and PayPal, using the official sandbox SDKs, plus a separate local simulator. Each provider package describes its exact routes.

```text
browser: plugin  →  your API  →  provider's API
```

This page is about the right side of that arrow: what your server must do. It is short, because the plugin contract is short.

## Why not call the provider from the browser {#why-not-straight-from-the-browser}

Three reasons, from the most urgent:

1. **The secret key.** Stripe's `sk_...`, Adyen's `x-api-key`, a bank's `userName`/`password`. Anything the browser can send, anyone can read and send too.
2. **The real result.** A browser tells you where it has been, not what happened. `?status=success` in a return address can be typed by anyone.
3. **CORS.** Most provider APIs do not answer browsers at all, and this is intentional.

## The endpoints {#the-four-endpoints}

A plugin needs the same small set of routes, whatever the provider looks like inside.

| Plugin method  | Your route                   | What it does                                           |
| -------------- | ---------------------------- | ------------------------------------------------------ |
| `createIntent` | `POST /payments`             | starts a payment, returns its id                       |
| `confirm`      | `POST /payments/:id/confirm` | takes the payment instrument, returns the result       |
| `resume`       | `POST /payments/:id/resume`  | takes what came back from the step, returns the result |
| `getIntent`    | `GET /payments/:id`          | the current state; this is the source of truth         |
| `cancel`       | `POST /payments/:id/cancel`  | optional                                               |

`getIntent` is the most important one. The engine uses it when an answer is not final, polling calls it, and a shopper who reloads the page ends up there.

## What must never be returned {#what-never-comes-back-out}

Return only what the checkout needs to show:

- the amount, the currency and the status;
- the bank's decline message, in the bank's own words;
- the next step, if the provider asked for one.

Never return the provider's raw response, your API keys, the card number, or anything you would not want in the browser's memory. The conformance tests check the card number for every plugin in this repository: they pay with a card and then search the whole returned object for it.

## Example: a card processor {#worked-example-a-card-processor}

Express, one provider, nothing extra. The plugin calls these routes; the browser keeps nothing secret.

```js
import express from 'express'
import Stripe from 'stripe'

const app = express()
app.use(express.json())

// The key lives here and nowhere else.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const toPayment = (intent) => ({
  id: intent.id,
  amount: intent.amount,
  currency: intent.currency.toUpperCase(),
  status: toStatus(intent.status),
  // The action the plugin will turn into a PaymentAction.
  nextAction: intent.next_action ?? null,
  error: intent.last_payment_error
    ? { code: intent.last_payment_error.code, message: intent.last_payment_error.message }
    : null,
})

app.post('/payments', async (req, res) => {
  // The price comes from your catalogue, never from the browser. A client that can name
  // its own amount will eventually name 1.
  const plan = await plans.byId(req.body.planId)

  const intent = await stripe.paymentIntents.create(
    { amount: plan.amount, currency: plan.currency, automatic_payment_methods: { enabled: true } },
    // Passed through from the plugin: a double-clicked button must not charge twice.
    { idempotencyKey: req.get('Idempotency-Key') },
  )

  res.status(201).json(toPayment(intent))
})

app.post('/payments/:id/confirm', async (req, res) => {
  const intent = await stripe.paymentIntents.confirm(
    req.params.id,
    { payment_method_data: toPaymentMethod(req.body.instrument), return_url: req.body.returnUrl },
    { idempotencyKey: req.get('Idempotency-Key') },
  )

  res.json(toPayment(intent))
})

app.post('/payments/:id/resume', async (req, res) => {
  // The browser is back from the bank. What it says is a hint; this is the answer.
  const intent = await stripe.paymentIntents.retrieve(req.params.id)

  res.json(toPayment(intent))
})

app.get('/payments/:id', async (req, res) => {
  res.json(toPayment(await stripe.paymentIntents.retrieve(req.params.id)))
})
```

Note what `resume` does **not** do: it does not read `req.body.evidence.params.status`. The data from the browser tells you _which_ payment came back. What happened to it, the provider tells you.

## The important rules {#the-rules-that-matter}

**The amount comes from your catalog.** The plugin sends a `planId`, not a price.

**Pass the idempotency key on.** The plugin creates one key per attempt and sends it with every request of that attempt. Forward it to the provider. This is what makes a retry safe.

**Check who is asking.** These routes move money. They need the same session or token check as the rest of your API, and the payment must belong to the person who asks about it.

**Webhooks decide; polling tells the page.** When a delayed payment completes, the provider calls your webhook. That is the event you trust and store. The checkout page finds out because `getIntent` starts returning the new status. Neither the plugin nor the engine needs to know that webhooks exist.

**Return the bank's message.** "Your card has insufficient funds" is what the shopper needs to hear. "Payment failed" sends them to your support team instead of to their bank.

## For a payment page, hosted fields, a wallet or a transfer {#for-a-hosted-page-fields-a-wallet-or-a-transfer}

The same routes, with one addition each:

- **Payment page on the provider's site** — register the order and return the page address with any signed parameters. When the shopper comes back, ignore the query string and read the order from the provider.
- **Hosted fields** — exchange the token for a charge. The token comes from the provider's frame; your server is what turns it into money.
- **Wallet** — your server sends the wallet data to the provider. Apple Pay also needs a merchant validation route, which by its nature runs on the server.
- **Instant transfer** — ask the provider for the code, return it, and let the engine poll `getIntent` until your webhook marks the payment as paid.

## What this repository does instead {#what-this-repository-does-instead}

The demo has no server. A fake backend built on MSW answers directly in the provider's format, so the plugins can be tested end to end without a server. Wherever a real integration would call your API, the demo calls the fake one. The plugin code is the same in both cases, which is why it is still a useful example.
