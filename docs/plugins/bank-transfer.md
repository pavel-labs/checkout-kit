# Bank transfer

> Русская версия: [ru/plugins/bank-transfer.md](../ru/plugins/bank-transfer.md)

`@checkout-kit/provider-bank-transfer` — id `transfer`

A code appears on the screen. The shopper opens their banking app, scans or types it, and pays.
A moment later the money is there.

**Pick this one when** you sell where this is how people pay — and that is a very large part of
the world: PIX in Brazil, UPI in India, BLIK in Poland, PromptPay in Thailand, SPEI in Mexico.
In several of those markets it outsells cards.

## What the shopper sees

1. They press Pay. No card, no redirect.
2. A QR code appears, with the amount and a short line of instructions.
3. They open their banking app and scan it. On a phone, they tap the code and the app opens
   directly.
4. Your checkout notices by itself, a second or two later, and shows the receipt.

## The part that is genuinely different

**Nothing on the page can see the payment happen.** It happens in another app, on the shopper's
phone, possibly on a different device entirely. There is no callback, no message, no redirect.

So the checkout asks. Repeatedly, until the money arrives or the code expires. That is what
`poll` means in the config, and for this plugin it is not optional — it is the only way the
payment can ever finish.

## Setting it up

```ts
import type { BankTransferConfig } from '@checkout-kit/provider-bank-transfer'

const transfer: BankTransferConfig = {
  baseUrl: '/api',
  // 'qr' to scan, 'code' to type, 'instructions' for written steps.
  format: 'qr',
  // Yours to write and to translate; the kit ships no wording for this.
  instructions: 'Scan this with your banking app, or copy the code into it.',
  // How often to ask, and for how long to keep asking.
  poll: { intervalMs: 2000, timeoutMs: 15 * 60 * 1000 },
}

defineProvider({
  id: 'transfer',
  config: transfer,
  load: () => import('@checkout-kit/provider-bank-transfer'),
})
```

Both `poll` values are a trade-off. Too frequent and you are hammering your own backend for
every waiting shopper; too long a timeout and abandoned payments sit open. Two seconds and
fifteen minutes is a reasonable start, and the default if you say nothing.

### Rendering it

The code draws inline, in the form, where the shopper is already looking:

```tsx
{
  action?.surface === 'inline' ? (
    <ActionFrame variant="content">
      <PaymentActionHost onSettled={settle} className="ck-action-host" />
    </ActionFrame>
  ) : null
}
```

`variant="content"` sizes itself to the code — a fixed height is what makes a QR flow look
broken.

The QR image, the copy button and the deep link are drawn by the runtime, not by React, and they
are styled by the `.ck-display__*` classes in the UI kit's stylesheet. If the provider gives an
expiry, `<Countdown expiresAt={action.expiresAt} />` shows it.

### Paying

```ts
await engine.pay({
  input: { planId: 'monthly' },
  instrument: { kind: 'none' },
  idempotencyKey: crypto.randomUUID(),
})
```

## What your backend must provide

| Call                               | What it does                              |
| ---------------------------------- | ----------------------------------------- |
| `POST /transfer/orders`            | opens an order                            |
| `POST /transfer/orders/:id/code`   | asks for the code, QR image and deep link |
| `GET  /transfer/orders/:id`        | has the money arrived? — asked repeatedly |
| `POST /transfer/orders/:id/cancel` | gives up on it                            |

That third one is called on a loop, so make it cheap. Read a status, do not recompute an order.

**Take the real answer from your provider's webhook**, not from the browser's polling. The
polling is how the _screen_ finds out; the payment being real is your backend's business.

## Trying it

`npm run dev:mock`, then pick "Bank transfer". The demo has a button that plays the part of the
shopper's banking app, so you can watch the checkout notice by itself.

## What can go wrong

**It sits on the code forever.** Your `GET` is not changing status, or `timeoutMs` is longer than
you think. The checkout is doing what it was told.

**The QR code will not scan.** It must stay dark on light whatever the theme — the UI kit forces
a white background behind it for exactly this reason. If you restyle it, keep that.

**The shopper pays after the timeout.** The money is real and the checkout has stopped watching.
This is why the webhook matters: your backend must settle the order regardless of what the
browser saw.

## What it declares

|                |                                          |
| -------------- | ---------------------------------------- |
| instruments    | `none` — the shopper's bank has the card |
| actions        | `display`                                |
| surfaces       | `inline`                                 |
| authentication | none — the banking app already did it    |
| cancel         | yes                                      |
| polling        | yes, and required                        |
