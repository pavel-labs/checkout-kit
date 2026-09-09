# Card processor

> Русская версия: [ru/plugins/psp.md](../ru/plugins/psp.md)

`@checkout-kit/provider-psp` — id `psp`

The shape most modern payment providers use: a JSON API, an idempotency header, and 3-D Secure 2
shown as a small challenge inside a frame on your page. Stripe, Checkout.com, Mollie and Adyen
all work roughly this way.

**Pick this one when** your provider gives you a JSON API, you are happy to render the card
fields yourself, and you want the bank's confirmation step to appear inside your checkout rather
than sending the shopper away.

## What the shopper sees

1. They type a card into your page and press Pay.
2. Most of the time it is over — approved or declined, right there.
3. Sometimes the bank wants a word first. A small frame appears with the bank's own screen in
   it — a code by SMS, an app confirmation. They finish, the frame closes, and the payment
   completes.

They never leave your page.

## Setting it up

```ts
import { createCheckout, defineProvider } from '@checkout-kit/core'
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
import type { PspConfig } from '@checkout-kit/provider-psp'

const psp: PspConfig = {
  // Your backend, not the provider. The secret key never reaches the browser.
  baseUrl: '/api',
  // The origin the bank's confirmation screen is served from. Messages from anywhere
  // else are ignored, which is what stops another page pretending the payment passed.
  acsOrigin: 'https://acs.yourbank.example',
}

const runtime = createBrowserRuntime({
  returnPath: '/payment/return',
  // Screen readers announce this when the frame appears, so say what it is.
  redirect: { frameTitle: () => '3-D Secure authentication' },
})

export const checkout = createCheckout({
  providers: [
    defineProvider({
      id: 'psp',
      config: psp,
      load: () => import('@checkout-kit/provider-psp'),
      eager: true,
    }),
  ],
  defaultProviderId: 'psp',
  runners: runtime.runners,
  storage: runtime.storage,
  returnUrl: runtime.returnUrl,
})
```

### Paying

```ts
await engine.pay({
  input: { planId: 'monthly' },
  instrument: {
    kind: 'card',
    number: createBranded('4242424242424242'),
    exp: createBranded('12/30'),
    cvc: createBranded('123'),
    holder: 'A Shopper',
  },
  // One key per attempt. If the same submit somehow reaches the provider twice, it
  // answers with the first payment instead of making a second one.
  idempotencyKey: crypto.randomUUID(),
})
```

This plugin also takes a card the shopper saved earlier. The browser holds an id, never a
number:

```ts
instrument: { kind: 'token', token: 'pm_1234', last4: '4242', scheme: 'visa' }
```

## What your backend must provide

Four endpoints under `baseUrl`. Your server holds the provider's secret key and translates:

| Call                                     | What it does                                           |
| ---------------------------------------- | ------------------------------------------------------ |
| `POST /payment-intents`                  | opens a payment for an amount                          |
| `POST /payment-intents/:id/confirm`      | sends the card or token; answers with status or a step |
| `GET  /payment-intents/:id`              | reads the current state                                |
| `POST /payment-intents/:id/cancel`       | gives up on it                                         |
| `POST /3ds/challenge/:actionId/complete` | finishes the bank's confirmation                       |

The `idempotency-key` header is forwarded on the writes. Pass it through to your provider —
that is what makes a retry safe.

**The amount is decided by your server, not sent from the browser.** The browser says which plan
was picked; the price is looked up server-side. See [The backend a plugin talks to](../backend.md).

## Trying it

```bash
npm run dev:mock   # the checkout
npm run dev:bank   # the bank, on its own https origin
```

Then `4242 4242 4242 4242` for an approval, `4000 0025 0000 3155` for a card that asks for
confirmation and passes. The one-time code in the simulator is `1234`.

Running the bank separately is deliberate: the confirmation frame is genuinely cross-origin, so
what you see in DevTools is the real security surface — `frame-ancestors`, `SameSite=None`
cookies, and the `event.origin` check that `acsOrigin` above drives.

## What can go wrong

**The frame appears and nothing happens.** `acsOrigin` does not match the origin actually
serving the bank screen, so its message is being ignored. It is an origin — scheme, host and
port, no path.

**The payment succeeds but the app never notices.** The confirmation finished after the shopper
closed the tab. `engine.hydrate()` on your return route picks that up; without it a payment can
complete at the bank and be lost on your side.

**A retry charges twice.** Your backend is not forwarding `idempotency-key` to the provider.

## What it declares

The engine uses this to decide what to render and what to allow — never to control the flow.

|                |                                   |
| -------------- | --------------------------------- |
| instruments    | `card`, `token`                   |
| actions        | `redirect`                        |
| surfaces       | `iframe`, `top`                   |
| authentication | none, 3-D Secure 2                |
| cancel         | yes                               |
| polling        | yes — some approvals arrive later |
