# Examples

Four things, each answering a different question about the library.

| Folder                                               | Question it answers                                        | Needs credentials? |
| ---------------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| [`react/`](./react/)                                 | What does a checkout screen using this library look like?  | No — mock backend  |
| [`providers/`](./providers/)                         | How do I map Stripe/Adyen/PayPal onto the plugin contract? | No — reads source  |
| [`server/`](./server/)                               | What does the backend behind those three adapters do?      | Yes, to run it     |
| [`react-native-checkout/`](./react-native-checkout/) | How does a native app host the same checkout?              | No — reads source  |

## Start here: the mock browser demo

```bash
npm install
npm run dev:react -w @checkout-kit/examples
```

Open `http://localhost:5173/`. One React page, nine provider buttons — the six built-in
mock protocols (`packages/provider-*`) plus Stripe, Adyen and PayPal adapters — all driving
the same `useCheckout`/`PaymentActionHost` pair. This is the fastest way to see whether the
engine's one loop actually covers a card redirect, a hosted page, hosted fields, a wallet
handoff and a QR/poll flow without special-casing any of them, before reading a line of the
adapter code.

## Then: the real adapters

[`providers/stripe.ts`](./providers/stripe.ts), [`adyen.ts`](./providers/adyen.ts) and
[`paypal.ts`](./providers/paypal.ts) are complete `PaymentProvider` implementations against
each provider's real wire format — not the mock backend's shapes. Read
[`providers/README.md`](./providers/README.md) for what each one expects from your server,
and [`usage.ts`](./providers/usage.ts) / [`scenarios.ts`](./providers/scenarios.ts) for how
they get registered and driven without React (a Node script, a different frontend, a
headless integration test).

To see all three take a real test-mode payment, run the example server next to the mock
demo:

```bash
# set STRIPE_SECRET_KEY, ADYEN_API_KEY, ADYEN_MERCHANT_ACCOUNT,
# PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET first
npm run dev:server -w @checkout-kit/examples
VITE_REAL_PROVIDER_API_BASE_URL=http://localhost:4000 npm run dev:react -w @checkout-kit/examples
```

[`server/index.ts`](./server/index.ts) is deliberately small: three route groups, one per
provider, each calling that provider's official SDK
(`stripe`, `@adyen/api-library`, `@paypal/paypal-server-sdk`) and returning its fields
unchanged. It is a sketch of the backend a real merchant needs, not a backend to deploy —
see [The backend a plugin talks to](../docs/backend.md) for what production adds
(webhooks, persistence, auth).

## Everything typechecks

```bash
npm run examples:typecheck
```

None of the examples build or run in CI beyond that — the mock demo needs a browser and the
server example needs live provider credentials — but every import, every provider config
and every use of the engine's types is checked on every push.
