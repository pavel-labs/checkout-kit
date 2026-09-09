# Hosted card fields

> Русская версия: [ru/plugins/hosted-fields.md](../ru/plugins/hosted-fields.md)

`@checkout-kit/provider-hosted-fields` — id `hostedfields`

The card inputs are drawn by the provider, inside their own frame, sitting inside your checkout.
The shopper types into that frame; you get back a token. The card never touches your page.

**Pick this one when** you want the shopper to stay on your site — unlike the
[hosted payment page](./hosted-page.md) — but you do not want the card in your DOM. It is the
usual middle ground, and what Stripe Elements and Braintree Hosted Fields are.

## What the shopper sees

A card form, in your layout, that looks like part of your checkout. They will not notice the
frame. They type, they press Pay, and it completes.

## What is actually happening

```text
your page                          the provider's origin
┌────────────────────────┐
│  Card number  ┌───────────────┐
│               │  their frame  │  ← the shopper types in here
│               └───────────────┘
│                        │   │
│   Pay  ────────────────┼───┘  a token comes back by postMessage
└────────────────────────┘
```

Your JavaScript cannot read inside that frame. **That is the entire point** — it is what keeps
your page out of the card's path, and it is also why you cannot validate the number yourself or
prefill it.

## Setting it up

```ts
import type { HostedFieldsConfig } from '@checkout-kit/provider-hosted-fields'

const hostedFields: HostedFieldsConfig = {
  baseUrl: '/api',
  // Where the provider serves the field frame from.
  fieldsUrl: 'https://fields.yourprovider.example/v1/fields',
  // Its origin. A message from anywhere else is ignored - this is the check that stops
  // another page claiming to be the card form.
  fieldsOrigin: 'https://fields.yourprovider.example',
}

const runtime = createBrowserRuntime({
  returnPath: '/payment/return',
  collectFields: { frameTitle: () => 'Card details' },
})

defineProvider({
  id: 'hostedfields',
  config: hostedFields,
  load: () => import('@checkout-kit/provider-hosted-fields'),
})
```

### Rendering it

The frame needs somewhere to go. It draws inline, in the form, where card fields would be:

```tsx
{
  action?.surface === 'inline' ? (
    <ActionFrame variant="inline">
      <PaymentActionHost onSettled={settle} className="ck-action-host" />
    </ActionFrame>
  ) : null
}
```

### Paying

Nothing is passed in — the token is produced inside the frame and arrives as evidence:

```ts
await engine.pay({
  input: { planId: 'monthly' },
  instrument: { kind: 'none' },
  idempotencyKey: crypto.randomUUID(),
})
```

Do not render your own card fields for this provider. Check `capabilities.instruments` as on the
[hosted page](./hosted-page.md#paying).

## What your backend must provide

| Call                                     | What it does                         |
| ---------------------------------------- | ------------------------------------ |
| `POST /hosted-fields/charges`            | opens a charge and a field session   |
| `POST /hosted-fields/charges/:id/pay`    | charges the token the frame produced |
| `GET  /hosted-fields/charges/:id`        | reads the outcome                    |
| `POST /hosted-fields/charges/:id/cancel` | gives up on it                       |

## Trying it

`npm run dev:mock`, then pick "Hosted fields". The demo serves the frame from its own origin,
because a browser-only mock cannot serve a second one — in production `fieldsOrigin` is genuinely
somebody else's domain, and that difference is the whole security model.

## What can go wrong

**The frame loads but Pay does nothing.** `fieldsOrigin` does not match the origin serving
`fieldsUrl`, so the token message is being dropped. It is an origin, not a URL — no path.

**You want to validate the card before submitting.** You cannot, and should not try. The frame
reports validity; anything your page could read, an attacker's script on your page could read
too.

**The frame is the wrong height.** `ActionFrame` has three variants. `inline` is right for
fields; `content` sizes itself, and `challenge` is for a full bank screen.

## What it declares

|                |                                                       |
| -------------- | ----------------------------------------------------- |
| instruments    | `none` — the token comes from the frame, not from you |
| actions        | `collect_fields`                                      |
| surfaces       | `inline`                                              |
| authentication | none, 3-D Secure 2                                    |
| cancel         | yes                                                   |
| polling        | yes                                                   |
