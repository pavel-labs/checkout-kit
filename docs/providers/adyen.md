# Adyen

> [Русская версия](../ru/providers/adyen.md)

Adyen's Advanced flow over your merchant API. Supports redirects, 3DS2 SDK actions,
saved methods and encrypted data from Adyen Web components.

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

Only `paymentMethod`, `browserInfo` and `origin` are forwarded from component data. Your
server owns the amount, currency, merchant account, order reference and return URL. The
`token` instrument means a storedPaymentMethodId. The raw `card` instrument and raw `number`/`cvc` inside component data are disabled
by default. Set `allowRawCardData: true` only for merchants whose Adyen account and
compliance arrangements explicitly permit that path. This flag is not PCI certification;
the example merchant server always rejects raw data.

| Merchant endpoint                               | Operation                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `POST /payments/sessions` with `{ planId }`     | Reserve a merchant order (not Adyen's Sessions API)                 |
| `POST /payments/:id`                            | Call Adyen `/payments` with merchant-owned price and component data |
| `POST /payments/:id/details` with `{ details }` | Call `/payments/details`, binding merchant-stored paymentData       |
| `GET /payments/:id`                             | Read authoritative merchant state, updated by verified webhooks     |
| `POST /payments/:id/cancel`                     | Cancel using the provider reference when one exists                 |

Return the safe subset `AdyenPayment`. Redirect URLs and form fields are preserved. The
full 3DS2 action is delivered as `params.action` to the configured runtime SDK adapter.
The adapter should mount Adyen's component and resolve from `onAdditionalDetails` with
`state.data`; do not resolve when the component is merely mounted. The plugin unwraps
`details` and does not accept browser-provided paymentData as authoritative.

The engine binds evidence to the action; the backend must also bind it to the order and
buyer. `Pending` and `Received` remain processing. A webhook is necessary for methods that
settle later: this package does not invent a status endpoint in Adyen's API.

Install/import the official Adyen Web SDK in the host. `scriptUrl` is optional for hosts that
already load it. Unknown actions fail explicitly instead of pretending to run them.

The contract and wire-format tests pass against fixtures, not a live Adyen account. See
[the integration examples](https://github.com/pavel-labs/checkout-kit/blob/main/examples/README.md) for the server boundary.

## Component and action integration

Set server `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_WEBHOOK_HMAC_KEY` and browser `VITE_ADYEN_CLIENT_KEY` for the test account. [AdyenFields.tsx](../../examples/react/AdyenFields.tsx) collects component data and resolves additional details.

Supported action types: `redirect`, `threeDS2`, `threeDS2Fingerprint`, `threeDS2Challenge`. Other regional/QR/SDK shapes need implementation; do not assume all account methods are covered.

Return [AdyenPayment](../../packages/provider-adyen/src/provider.ts): merchant id, integer amount/currency, resultCode, optional action and safe refusals. Authorised maps to succeeded: align capture and fulfillment with that mapping. The example does not implement manual capture. Pending/Received stay processing.

Bind paymentData server-side. The server verifies HMAC, account, amount/currency and event ordering; replace its memory store with a database.

[Merchant integration](../merchant-integration.md) · [Recovery](../runtime.md) · [Adyen Advanced flow](https://docs.adyen.com/online-payments/web-drop-in/advanced-flow)
