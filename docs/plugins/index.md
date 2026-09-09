# Using the payment plugins

> Русская версия: [ru/plugins/index.md](../ru/plugins/index.md)

A plugin is the part that knows how one payment provider talks. It creates a payment, sends the
instrument, and says what happened. Everything else — the screens, the state, the retry, the
frame a bank draws in — is the same whichever plugin you pick.

You register plugins once, at startup, and switch between them by id:

```ts
await engine.useProvider('psp')
await engine.pay({ input: { planId: 'monthly' }, instrument: card })
```

That is the whole difference between six very different integrations, from your code's side.

## Which one do I need?

Start from what the shopper does, not from the provider's name.

| The shopper…                                | Plugin                                   | Types a card into your page? |
| ------------------------------------------- | ---------------------------------------- | ---------------------------- |
| types a card, bank may ask for confirmation | [Card processor](./psp.md)               | yes                          |
| types a card, older bank, direct connection | [Acquiring bank](./acquiring.md)         | yes                          |
| leaves for the bank's own page              | [Hosted payment page](./hosted-page.md)  | no                           |
| types a card into the provider's frame      | [Hosted card fields](./hosted-fields.md) | no                           |
| taps Apple Pay, Google Pay, PayPal          | [Wallet](./wallet.md)                    | no                           |
| scans a QR in their banking app             | [Bank transfer](./bank-transfer.md)      | no                           |

The last column is the one that matters most, and it is not a UI question. **A card typed into
your own page puts you in scope for a much longer PCI questionnaire.** Hosted fields and the
hosted page exist to move that boundary; they are the only two that take your page out of the
card's path.

## The same three moments, every time

Whatever you pick, a payment goes through the same three moments. It helps to know which one
you are looking at when something goes wrong.

```text
1. create      Your backend asks the provider to open a payment.
2. confirm     The instrument goes over. The provider answers one of:
                 - done (approved or declined)
                 - not yet: do this first  ──┐
3. the step    ─────────────────────────────┘
               A frame, a redirect, a wallet sheet, a QR code. It finishes,
               and the provider is asked again. Repeat until the answer is final.
```

Step 3 is where the plugins differ, and it is the only place they differ. Each page below says
which step its provider asks for and how that step ends.

## Setting one up, in general

Before any of this, [Setting up your environment](./setup.md) covers what to install, what to
import, and what belongs in `.env` — all of it the same whichever plugin you pick.

Three things, always in the same order.

**1. Configure it.** Every plugin exports a config type. Import the type — that is also how the
plugin registers its id with TypeScript, so `defineProvider({ id: 'psp' })` is checked:

```ts
import type { PspConfig } from '@checkout-kit/provider-psp'

const psp: PspConfig = { baseUrl: '/api', acsOrigin: 'https://acs.yourbank.example' }
```

**2. Register it.** `load` is a dynamic import, so each plugin is its own chunk and a shopper
who never picks it never downloads it. Mark the one you show first as `eager`:

```ts
defineProvider({
  id: 'psp',
  config: psp,
  load: () => import('@checkout-kit/provider-psp'),
  eager: true,
})
```

**3. Give the browser runtime what that plugin needs.** Most need nothing. A wallet needs an
adapter for its SDK; a plugin that draws a frame can take a title for it. See each page.

```ts
const runtime = createBrowserRuntime({ returnPath: '/payment/return' })
```

A complete, working composition root with all six is
[`apps/demo/src/app/providers/checkout.ts`](../../apps/demo/src/app/providers/checkout.ts).

## Trying any of them without a provider

Every plugin here is written against the mock backend in `@checkout-kit/testing`, so you can run
all six with no accounts and no keys:

```bash
npm run dev:mock   # the demo, with the mock backend in the browser
npm run dev:bank   # the 3-D Secure simulator, for the card flows
```

The card decides the outcome. These are the ones the mock backend knows:

| Card                  | What happens                    |
| --------------------- | ------------------------------- |
| `4242 4242 4242 4242` | approved                        |
| `4000 0000 0000 0002` | declined                        |
| `4000 0000 0000 9995` | declined, insufficient funds    |
| `4000 0025 0000 3155` | 3-D Secure, and it passes       |
| `4000 0084 0000 1629` | 3-D Secure, and it fails        |
| `4000 0000 0000 9979` | still processing, settles later |

## One thing to be honest about

These six plugins are reference implementations. They are written against a mock backend and
**none of them has taken a real payment.** They show what a plugin for each shape looks like and
they pass the conformance suite; treat them as a starting point for your own, not as an
integration you can point at a live provider today.

If you are writing one for a provider that is not here, read
[Writing a payment plugin](../plugin-authoring.md), then
[Real providers, mapped onto the contract](../real-world-providers.md).
