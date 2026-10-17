# Test your integration

> [Русская версия](./ru/testing.md)

There are three levels of checks, and each finds different problems:

- **fixtures** (saved test data) check that an adapter speaks the provider's protocol correctly;
- **simulators** (fake providers) check that the whole payment flow works in your app;
- **your sandbox account** at the real provider checks the real SDK and your account settings.

## Checks in this repository {#repository-checks}

| Command                                                    | What it checks                                                                                                                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`                                                 | The engine, the example HTTP server, provider contracts, React/UI, runners and the mobile bridge.                                                                                                |
| `npm run test:e2e`                                         | The six example protocols in a real browser, with scenarios for each feature.                                                                                                                    |
| `npm run test:integration`                                 | Stripe, Adyen and PayPal through the HTTP server: approval, decline, status polling, redirect, capture and retry.                                                                                |
| `npm run typecheck` / `npm run examples:typecheck`         | Types of the packages and of the examples that use them.                                                                                                                                         |
| `npm run verify:consumer`                                  | Installs all 16 archives, plus small sets without React and with React, into a clean project. Checks strict types, exports, a payment run in Node, SSR, and that damaged downloads are rejected. |
| `npm run lint` / `npm run format:check` / `npm run purity` | Code style, and that the core and the native entry points have no browser-only code.                                                                                                             |
| `npm run docs:api` / `npm run docs:build`                  | Builds the API reference from the type declarations, builds the site and checks pages and links.                                                                                                 |

Browser tests need Playwright with Chromium. Locally, run `npx playwright install chromium` once; CI installs it by itself. Build the type declarations before generating the API reference.

## Test helpers {#test-helpers}

| Import                          | What is inside                                                                |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `@checkout-kit/testing`         | Test cards for each scenario and decline messages. No fake server.            |
| `@checkout-kit/testing/engine`  | Fake providers, runners with a fixed script, ready payment and step data.     |
| `@checkout-kit/testing/backend` | MSW request handlers and a payment state that can be reset.                   |
| `@checkout-kit/conformance`     | The Vitest test suite for providers. Needs core, testing, MSW 2 and Vitest 5. |

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

What the parts mean:

- `instrumentFor` returns what the shopper "pays with" in each test scenario;
- `evidenceFor` returns what would come back after the extra step. It can first perform the simulated bank's step and then return the matching data;
- your own handlers can provide `reset: async () => { ... }`, which runs before each test case.

## What the contract checks {#what-the-contract-requires}

The test suite checks that the plugin follows these rules:

- what the plugin says it supports matches how it really works with instruments and steps;
- a repeated "create" with the same key returns the same payment;
- real amounts, the bank's decline text and the "processing" state are passed through unchanged;
- failures come back as error data, not as thrown exceptions;
- card fields are never sent back in responses;
- an unknown step fails, and valid data from **another** order fails too;
- repeating the same "continue" cannot charge twice;
- "confirm" cannot reopen a successful payment;
- "cancel" cannot overwrite a paid payment.

Your server must enforce the same rules atomically. Reading data in the adapter is not a database lock.

## Fake state and account checks {#mock-state-and-account-checks}

In Node tests, fixtures reset their in-memory data. In the browser demo, the simulated state is kept in session storage so that it survives full-page redirects; `resetBackend()` clears it. Never use test tokens or test cards in real requests.

With your real sandbox account, check: collecting the card with the SDK, the bank's check, the return page, capture, checked webhooks, lost replies and a closed browser. Follow [the provider guide](./packages.md#named-provider-adapters) and [merchant server](./merchant-integration.md).
