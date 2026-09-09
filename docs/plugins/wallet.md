# Wallet

> Русская версия: [ru/plugins/wallet.md](../ru/plugins/wallet.md)

`@checkout-kit/provider-wallet` — id `wallet`

Apple Pay, Google Pay, PayPal, and the local equivalents. A third-party script draws its own
sheet, the shopper approves with a face or a fingerprint, and a payload comes back.

**Pick this one when** you want the fastest checkout there is. There is nothing to type, so it
converts better than anything else on this list.

Worth remembering: **a wallet is a way of presenting a card, not a way of avoiding one.** The
card behind it still decides the outcome, and it can still be declined.

## What the shopper sees

They tap the wallet button. The operating system's own sheet slides up — their cards, their
address, Face ID. They approve. Done, usually in about three seconds.

You draw none of that. The sheet belongs to the wallet.

## The adapter is the part you write

The checkout does not know how to drive any particular wallet SDK, and it should not. You give
it one function that does:

```ts
const runtime = createBrowserRuntime({
  returnPath: '/payment/return',
  sdk: {
    adapters: [
      {
        // Must match `sdk` in the config below.
        sdk: 'apple-pay',
        // Called once the script has loaded. Show the sheet, return what it gives you.
        request: async (params) => {
          const session = window.ApplePaySession /* ...set up from params... */
          return await showTheSheet(session)
        },
      },
    ],
  },
})
```

That function is the entire coupling between this checkout and that wallet. It lives in your
app, because the SDK is your relationship, not the kit's.

**If the shopper closes the sheet, throw.** The runner reads a throw as "the shopper backed
out", not as a failure, and puts them back on the form with nothing charged.

## Setting it up

```ts
import type { WalletConfig } from '@checkout-kit/provider-wallet'

const wallet: WalletConfig = {
  baseUrl: '/api',
  // The adapter key above.
  sdk: 'apple-pay',
  scriptUrl: 'https://applepay.cdn-apple.com/jsapi/1.0/apple-pay-sdk.js',
  // If the wallet publishes a subresource integrity hash, use it. You are loading
  // somebody else's script into your payment page.
  integrity: 'sha384-...',
  merchantName: 'Your Store',
}

defineProvider({
  id: 'wallet',
  config: wallet,
  load: () => import('@checkout-kit/provider-wallet'),
})
```

### Paying

```ts
await engine.pay({
  input: { planId: 'monthly' },
  instrument: { kind: 'none' },
  idempotencyKey: crypto.randomUUID(),
})
```

### The button

The kit does not ship one, and will not. Apple and Google both publish rules about the size,
corner radius and wording of their buttons, and both can withdraw your access over a redrawn
one. Use the button their SDK gives you; `ExpressCheckout` holds the space:

```tsx
<ExpressCheckout layout="row">
  <div ref={applePayButtonContainer} />
  <div ref={googlePayButtonContainer} />
</ExpressCheckout>
```

## What your backend must provide

| Call                              | What it does                           |
| --------------------------------- | -------------------------------------- |
| `POST /wallet/charges`            | opens a charge                         |
| `POST /wallet/charges/:id/pay`    | charges the payload the sheet returned |
| `GET  /wallet/charges/:id`        | reads the outcome                      |
| `POST /wallet/charges/:id/cancel` | gives up on it                         |

## Trying it

`npm run dev:mock`, then pick "Wallet SDK". The demo registers a fake wallet that shows a small
sheet of its own, so you can walk the flow — including closing it — without an Apple developer
account.

## What can go wrong

**"The wallet SDK did not register itself."** The script loaded but did not put what your
adapter expects on `window`. Check `scriptUrl`, and check the SDK's own readiness callback
rather than assuming it is ready when the script tag finishes.

**Closing the sheet shows an error screen.** Your adapter is returning or rejecting in a way the
runner reads as a failure. Throw on dismissal; that is the signal for "cancelled".

**Apple Pay does not appear at all.** It needs a registered merchant domain and a real device or
Safari. Nothing in the checkout can work around that.

## What it declares

|                |                                                         |
| -------------- | ------------------------------------------------------- |
| instruments    | `none` — the payload arrives from the SDK, not from you |
| actions        | `sdk_handoff`                                           |
| surfaces       | `none` — nothing of yours is rendered                   |
| authentication | the wallet's own                                        |
| cancel         | yes                                                     |
| polling        | yes                                                     |
