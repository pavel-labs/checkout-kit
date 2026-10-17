# @checkout-kit/conformance

A ready test suite (for Vitest) that checks whether a payment provider plugin follows the rules of the checkout kit engine. You give it your provider, its config, MSW request handlers, and what the shopper pays with and what comes back after each step in each test scenario.

Install it together with `@checkout-kit/core`, `@checkout-kit/testing`, MSW 2 and Vitest 5. See [installation](https://pavel-labs.github.io/checkout-kit/getting-started.html).

```ts
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
```

| Option                           | What it is                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `provider`, `config`, `handlers` | Your plugin, its config and the fake server for it.                                                  |
| `instrumentFor(case)`            | What the shopper pays with in each case: approve, decline, challengePass, challengeFail, processing. |
| `evidenceFor(action, case)`      | What comes back after a step. Can first perform the provider-side step (async).                      |
| `declineMessage`                 | The bank's decline text you expect.                                                                  |
| `secrets?`                       | Extra sensitive strings that must never appear in results.                                           |
| `planId?`                        | Default: `1id`.                                                                                      |
| `reset?`                         | Cleanup before each case (sync or async). Default: `resetBackend`.                                   |

What the suite checks:

- the declared capabilities match the real behavior;
- a repeated request with the same key returns the same result;
- amounts, declines and the "processing" state are passed through correctly;
- errors come back as data;
- only supported steps are returned;
- unknown step data and data from another order are rejected;
- a repeated "continue" does not charge twice;
- "confirm" and "cancel" cannot change a paid payment.

Any MSW request without a handler fails the test.

If your state is independent from the default fake server, pass your own `reset`. Your server must still check order ownership, prices, make idempotency atomic and allow only valid status changes. Check your real account settings separately.

[Testing guide](https://pavel-labs.github.io/checkout-kit/testing.html) · [Writing a provider](https://pavel-labs.github.io/checkout-kit/plugin-authoring.html)
