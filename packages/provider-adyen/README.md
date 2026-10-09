# @checkout-kit/provider-adyen

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
`token` instrument means a storedPaymentMethodId. The raw `card` instrument is also
supported for merchants whose Adyen account and compliance arrangements permit it.

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
[the integration examples](../../examples/README.md) for the server boundary.
