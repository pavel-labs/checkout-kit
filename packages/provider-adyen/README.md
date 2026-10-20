# @checkout-kit/provider-adyen

This adapter works with Adyen's **Advanced flow** through your server. It supports redirects, 3DS2 steps in the Adyen SDK, saved payment methods and encrypted data from Adyen Web components.

## Install from npm

```bash
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-adyen @adyen/adyen-web
```

[npm package](https://www.npmjs.com/package/@checkout-kit/provider-adyen) · [Installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html#install-from-npm)

```ts
import { defineProvider } from '@checkout-kit/core'
import type { AdyenConfig } from '@checkout-kit/provider-adyen'

const registration = defineProvider({
  id: 'adyen',
  config: { baseUrl: '/api/adyen', sdk: 'adyen' } satisfies AdyenConfig,
  load: () => import('@checkout-kit/provider-adyen'),
})

// `state.data` is supplied by your Adyen Web component's onSubmit callback.
await checkout.pay({
  input: { planId: 'starter' },
  instrument: { kind: 'wallet', walletId: 'adyen', payload: state.data },
})
```

## What is sent, and raw card data

From the component data, only `paymentMethod`, `browserInfo` and `origin` are sent to your server. The amount, currency, merchant account, order reference and return address are set by your server.

The `token` instrument means a saved payment method (`storedPaymentMethodId`).

Raw card data is **off by default**: the `card` instrument and `number`/`cvc` inside the component data are rejected. Set `allowRawCardData: true` only if your Adyen account and your compliance arrangements explicitly allow it. This flag is not a PCI certification. The example server always rejects raw card data.

## What your server must do

| Your route                                      | What it does                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| `POST /payments/sessions` with `{ planId }`     | Reserves an order on your side. (This is **not** Adyen's Sessions API.)   |
| `POST /payments/:id`                            | Calls Adyen `/payments` with the server's price and the component data.   |
| `POST /payments/:id/details` with `{ details }` | Calls `/payments/details`, adding the `paymentData` stored on the server. |
| `GET /payments/:id`                             | Reads the real state from your server. Checked webhooks update it.        |
| `POST /payments/:id/cancel`                     | Cancels using the provider's reference, if there is one.                  |

Return only the safe part of the data: `AdyenPayment`.

## Extra steps

- Redirect addresses and form fields are passed on unchanged.
- The full 3DS2 step is given to your SDK adapter as `params.action`.
- The adapter should show Adyen's component and return `state.data` from `onAdditionalDetails`. Do **not** return when the component has only appeared on the screen.
- The plugin unpacks `details`. It does not trust `paymentData` sent from the browser.

Supported step types: `redirect`, `threeDS2`, `threeDS2Fingerprint`, `threeDS2Challenge`. Other kinds (regional methods, QR codes, other SDKs) need extra work. Do not assume that all methods on your account are covered. Unknown steps fail with a clear error instead of pretending to work.

Install and import the official Adyen Web SDK in your app. `scriptUrl` is optional, for apps that already load the script themselves.

## Statuses and webhooks

The engine links each step result to its step. Your server must also link it to the order and the buyer.

- `Authorised` means succeeded. Make your capture and order delivery match this. The example does not implement manual capture.
- `Pending` and `Received` stay "processing".
- Payment methods that complete later need a webhook. This package does not invent a status endpoint that Adyen's API does not have.

Keep `paymentData` on the server. The server checks the webhook's HMAC signature, the account, the amount, the currency and the order of events. Replace the example's in-memory storage with a database.

## Setup and testing

For your test account, set the server variables `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_WEBHOOK_HMAC_KEY` and the browser variable `VITE_ADYEN_CLIENT_KEY`. [AdyenFields.tsx](https://github.com/pavel-labs/checkout-kit/blob/main/examples/react/AdyenFields.tsx) collects the component data and returns the extra details.

Your server returns an [AdyenPayment](https://github.com/pavel-labs/checkout-kit/blob/main/packages/provider-adyen/src/provider.ts): your own payment id, amount as an integer, currency, `resultCode`, an optional step and a safe decline reason.

The contract and request/response format tests run on saved test data, not on a real Adyen account. See [the integration examples](https://github.com/pavel-labs/checkout-kit/blob/main/examples/README.md) for the server part.

[Merchant server](https://pavel-labs.github.io/checkout-kit/merchant-integration.html) · [Recovery](https://pavel-labs.github.io/checkout-kit/runtime.html) · [Adyen Advanced flow](https://docs.adyen.com/online-payments/web-drop-in/advanced-flow)
