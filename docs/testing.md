# Test your integration

> [Русская версия](./ru/testing.md)

Fixtures validate adapter protocols. Simulators exercise application lifecycle. Your selected account's sandbox validates its actual SDK and settings.

## Repository checks

| Command                                                    | Verifies                                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm test`                                                 | Engine, HTTP merchant server, provider contracts, React/UI, runners and bridge.                       |
| `npm run test:e2e`                                         | Six reference protocols in a browser, with capability-specific scenarios.                             |
| `npm run test:integration`                                 | Stripe/Adyen/PayPal through the HTTP server: approval, decline, polling, redirect, capture and retry. |
| `npm run typecheck` / `npm run examples:typecheck`         | Package and consuming example types.                                                                  |
| `npm run verify:consumer`                                  | Install all 16 archives separately; strict types, exports, Node checkout and React SSR.               |
| `npm run lint` / `npm run format:check` / `npm run purity` | Code checks and platform-neutral core/native entry points.                                            |
| `npm run docs:api` / `npm run docs:build`                  | API from built declarations; site, page and anchor checks.                                            |

Browser suites need Playwright Chromium: run `npx playwright install chromium` locally; CI installs it. Build declarations before API generation.

## Test helpers

| Entry point                     | Use                                                                |
| ------------------------------- | ------------------------------------------------------------------ |
| `@checkout-kit/testing`         | Scenario cards and decline copy, without the mock server.          |
| `@checkout-kit/testing/engine`  | Fake providers, scripted runners, intent/action fixtures.          |
| `@checkout-kit/testing/backend` | MSW handlers and resettable payment state.                         |
| `@checkout-kit/conformance`     | Vitest provider contract; core, testing, MSW 2 and Vitest 5 peers. |

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

Custom handlers can provide `reset: async () => { ... }` before each case. `evidenceFor` may first perform the simulated bank's action, then return correlated evidence.

## What the contract requires

Capabilities agree with instrument/action behavior. Creation keys replay intents. Real amounts, issuer decline wording and processing are preserved; failures are error data; card fields are not echoed.

Unknown actions and another order's valid evidence fail. Repeated resume cannot spend twice, confirmation cannot reopen success, and cancel cannot overwrite paid. Enforce these invariants atomically on your merchant server: adapter reads are not a database lock.

## Mock state and account checks

Node fixtures reset in-memory maps. The demo browser persists simulated state in session storage across top redirects; `resetBackend()` clears it. Mock tokens/cards never belong in real requests.

Account checks include SDK collection, authentication, return routing, capture, verified webhooks, lost replies and browser closure. Follow [the provider guide](./packages.md#named-provider-adapters) and [merchant integration](./merchant-integration.md).
