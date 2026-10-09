# @checkout-kit/conformance

Run the public payment-provider contract in Vitest with your provider, configuration, MSW handlers and scenario instruments/evidence. Install with core, testing, MSW 2 and Vitest 5 peers. See [installation](https://pavel-labs.github.io/checkout-kit/getting-started.html).

~~~ts
import { describeProviderContract } from '@checkout-kit/conformance'
import { paymentIntentHandlers, threeDsHandlers } from '@checkout-kit/testing/backend'
import { SCENARIO_CARDS, declineMessage } from '@checkout-kit/testing'
import { pspProvider } from '@checkout-kit/provider-psp'
import type { CardNumber, CardExpiration, CvcCode } from '@checkout-kit/core'

const origin = 'https://acs.test'
describeProviderContract({
  provider: pspProvider,
  config: { baseUrl: 'http://payments.test/api', acsOrigin: origin },
  handlers: [...paymentIntentHandlers, ...threeDsHandlers],
  declineMessage: declineMessage(),
  instrumentFor: (scenario) => ({
    kind: 'card',
    number: SCENARIO_CARDS[scenario] as CardNumber,
    exp: '12/30' as CardExpiration,
    cvc: '123' as CvcCode,
  }),
  evidenceFor: (action, scenario) => ({
    via: 'post_message',
    actionId: action.id,
    origin,
    data: {
      type: '3ds-cres',
      challengeId: action.id,
      transStatus: scenario === 'challengeFail' ? 'N' : 'Y',
    },
  }),
})
~~~


| Fixture property | Purpose |
| --- | --- |
| `provider`, `config`, `handlers` | Adapter and merchant fixture. |
| `instrumentFor(case)` | approve, decline, challengePass, challengeFail, processing. |
| `evidenceFor(action, case)` | Correlated evidence; may perform provider-side actions asynchronously. |
| `declineMessage` | Expected issuer text. |
| `secrets?` | Additional sensitive strings that must not appear in results. |
| `planId?` | Defaults to `1id`. |
| `reset?` | Sync/async cleanup before each case; defaults to `resetBackend`. |

The suite checks capabilities, replay, money, declines, processing, error data, supported actions, unknown/foreign evidence, repeated resume and paid confirmation/cancellation. Unhandled MSW requests fail.

Use your own reset for independent state. The merchant must still enforce ownership, price, atomic idempotency and transitions. Verify your configured account separately.

[Testing guide](https://pavel-labs.github.io/checkout-kit/testing.html) · [Provider authoring](https://pavel-labs.github.io/checkout-kit/plugin-authoring.html)
