# Hosted payment page

> Русская версия: [ru/plugins/hosted-page.md](../ru/plugins/hosted-page.md)

`@checkout-kit/provider-hpp` — id `hpp`

The shopper leaves your site for the bank's own payment page, pays there, and comes back. Your
code never sees a card at any point.

**Pick this one when** you want the smallest possible PCI footprint and can live with sending
the shopper away. It is the least work of any option here and the one that puts the least of you
in the card's path.

## What the shopper sees

1. They press Pay. There are no card fields on your page — nothing to fill in.
2. The whole tab goes to the bank's page.
3. They pay there, including any confirmation step.
4. The bank sends them back to your return URL.
5. Your checkout picks the payment back up and shows the outcome.

## The one thing you must get right

**Step 4 destroys your tab.** Everything in memory is gone. When the shopper comes back, the
checkout has to find the payment again — that is `hydrate()`, and without it this plugin can
start a payment but never finish one:

```ts
// On the route your returnPath points at.
useEffect(() => {
  void engine.hydrate(runtime.readReturnParams())
}, [engine])
```

The engine wrote what it needed to session storage before the redirect. `hydrate` reads it back,
takes the parameters the bank put on the URL, and asks the provider what actually happened.

## It does not trust the return URL

The bank sends the shopper back to something like `?status=success`. The shopper could have
typed that. So the plugin ignores it and re-reads the order from your backend instead.

That is worth copying if you write your own plugin. **A query parameter is a claim, not a fact.**

## Setting it up

```ts
import type { HostedPageConfig } from '@checkout-kit/provider-hpp'

const hostedPage: HostedPageConfig = {
  // Your backend: registers orders and reads them back.
  baseUrl: '/api',
  // Where the bank's payment form lives. A different site, in production.
  pageUrl: 'https://pay.yourbank.example/checkout',
}

defineProvider({
  id: 'hpp',
  config: hostedPage,
  load: () => import('@checkout-kit/provider-hpp'),
})
```

### Paying

There is no card to send, so the instrument is `none`. That is not a missing value — it is what
this provider expects:

```ts
await engine.pay({
  input: { planId: 'monthly' },
  instrument: { kind: 'none' },
  idempotencyKey: crypto.randomUUID(),
})
```

Your form should not render card fields for this provider. The engine tells you:

```ts
const { capabilities } = useCheckout()
const collectsCard = capabilities?.instruments.includes('card') ?? true
```

## What your backend must provide

| Call                      | What it does                       |
| ------------------------- | ---------------------------------- |
| `POST /hosted/orders`     | registers an order, returns its id |
| `GET  /hosted/orders/:id` | reads the outcome after the return |

## Trying it

`npm run dev:mock`, then pick "Hosted payment page". The demo stands in a payment page of its
own, because a browser-only mock cannot answer requests from a second origin — in production
that page is genuinely somewhere else.

## What can go wrong

**The shopper comes back to a blank checkout.** `hydrate()` is not being called on the return
route. This is the mistake, and it is invisible until you test the real flow.

**It works locally and breaks in production.** Your `returnPath` is relative to the app's base
path. If the app is served from a sub-path, build the return URL from that base rather than
hardcoding `/payment/return`.

**The payment page refuses to load in a frame.** Correct, and deliberate. This plugin only
declares the `top` surface: a bank's payment page should not be frameable, because a frame is
how a fake one is built.

## What it declares

|                |                                                         |
| -------------- | ------------------------------------------------------- |
| instruments    | `none`                                                  |
| actions        | `redirect`                                              |
| surfaces       | `top` only                                              |
| authentication | none, 3-D Secure 1 and 2                                |
| cancel         | no — once they are on the bank's page, it is the bank's |
| polling        | yes                                                     |
