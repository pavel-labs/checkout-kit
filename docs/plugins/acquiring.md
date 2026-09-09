# Acquiring bank

> Русская версия: [ru/plugins/acquiring.md](../ru/plugins/acquiring.md)

`@checkout-kit/provider-acquiring` — id `acquiring`

A direct, host-to-host connection to a bank's own acquiring system. These are older than the
JSON providers and they show it: form-encoded bodies, credentials repeated in every request,
numeric status codes, and 3-D Secure 1 rather than 2.

**Pick this one when** you have a contract with a bank directly rather than through a payment
provider — common in Eastern Europe, Central Asia and with national banks generally.

It exists in this repository mostly to prove a point: this is about as unlike the
[card processor](./psp.md) as two card integrations get, and none of the difference reaches your
code.

## What is different about it

Worth knowing before you debug it, because it surprises people:

- **A declined card arrives as a successful HTTP request.** 200 OK, with a status field saying
  it failed. The plugin turns that into a normal decline for you.
- **Statuses are numbers.** `orderStatus: 2` means paid. `actionCode` says why a card was
  refused.
- **Starting a payment takes two round trips**, not one: register the order, then send the card.
- **Credentials go in the body of every call**, not in a header. That is how the protocol works.
- **3-D Secure 1**, which means a form is POSTed to the bank with a `PaReq` blob, instead of the
  small JSON challenge version 2 uses.

## What the shopper sees

Exactly what they see with the card processor: they type a card, and either it is done or a
frame appears with the bank's confirmation screen. The differences above are all below the
waterline.

## Setting it up

```ts
import type { AcquiringConfig } from '@checkout-kit/provider-acquiring'

const acquiring: AcquiringConfig = {
  // Your backend, which holds the bank credentials and proxies to it.
  baseUrl: '/acquiring',
  userName: 'issued-by-the-bank',
  password: 'issued-by-the-bank',
  acsOrigin: 'https://acs.yourbank.example',
}

defineProvider({
  id: 'acquiring',
  config: acquiring,
  // Lazy: a shopper who never picks this one never downloads it.
  load: () => import('@checkout-kit/provider-acquiring'),
})
```

::: warning Those credentials are not for the browser
`userName` and `password` here are for the _hop between your server and the bank_. Point
`baseUrl` at your own backend and let it add the real ones. If you put a bank credential in a
front-end bundle, it is public.
:::

Paying is identical to the card processor — same `instrument`, same call.

## What your backend must provide

Your server proxies to the bank's REST endpoints, form-encoded:

| Call                                   | What it does                                         |
| -------------------------------------- | ---------------------------------------------------- |
| `POST /rest/register.do`               | registers the order and gets an order id             |
| `POST /rest/paymentorder.do`           | sends the card; answers paid, refused, or 3-D Secure |
| `POST /rest/finish3ds.do`              | finishes the confirmation                            |
| `POST /rest/getOrderStatusExtended.do` | reads the order                                      |
| `POST /rest/reverse.do`                | cancels it                                           |

If you have seen a bank integration of this family before, these names will look familiar —
that is the point.

## Trying it

`npm run dev:mock` and `npm run dev:bank`, then pick "Acquiring bank" in the demo. The same
test cards as everywhere else. The bank simulator serves the 3-D Secure 1 flow for this one, so
you can watch the `PaReq` form post rather than a JSON challenge.

## What can go wrong

**Everything returns "success" and the payment never completes.** You are reading the HTTP
status instead of the body's status field. The plugin handles this; a hand-rolled integration
usually does not, first time.

**The frame is empty.** `acsOrigin` mismatch, same as with the card processor.

**A number appears in an error message.** `actionCode` reached the shopper. Branch on
`PaymentError.code` for your own wording — but keep the issuer's `message` available, because
that is what the shopper repeats to their bank.

## What it declares

|                |                    |
| -------------- | ------------------ |
| instruments    | `card`             |
| actions        | `redirect`         |
| surfaces       | `iframe`, `top`    |
| authentication | none, 3-D Secure 1 |
| cancel         | yes                |
| polling        | yes                |
