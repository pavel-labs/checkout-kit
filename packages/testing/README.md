# @checkout-kit/testing

Fixtures and simulators for checkout development. These do not call provider accounts or process real payments.

| Entry point                     | Exports                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| `@checkout-kit/testing`         | SCENARIO_CARDS, outcomes and decline copy, without the backend.            |
| `@checkout-kit/testing/engine`  | createFakeProvider, fakeIntent/action, scripted runners and abort helpers. |
| `@checkout-kit/testing/backend` | MSW handlers, resetBackend and simulated merchant state.                   |

## Engine fixtures

```ts
import { createCheckout } from '@checkout-kit/core'
import { createFakeProvider, createScriptedRunners } from '@checkout-kit/testing/engine'

const { provider, calls } = createFakeProvider()
const engine = createCheckout({
  providers: [{ id: provider.id, config: {}, load: () => provider }],
  defaultProviderId: provider.id,
  runners: createScriptedRunners(),
  returnUrl: 'https://shop.test/return',
})
const result = await engine.pay({
  input: { planId: '1id' },
  instrument: { kind: 'none' },
})
console.log(result.status, calls.confirm.length)
```

Script confirm/resume outcomes, delay creation/read responses and inspect calls to verify retries, aborts and host lifecycle without a network.

## MSW backend

Install MSW 2 only when using /backend. Register its handlers with setupServer in Node or setupWorker explicitly in the demo browser; resetBackend cleans the fixture.

Node state is in memory. The browser demo persists simulated state in session storage to survive top redirects. It is still a simulator, not an application database or authenticated merchant server. Scenario cards/tokens never go to real payment APIs.

The [reference composition](../../apps/demo/src/app/providers/checkout.ts) registers the six protocols. [Testing](https://pavel-labs.github.io/checkout-kit/testing.html) distinguishes fixtures, HTTP integration, browser scenarios and account checks.

[Русская версия](./README.ru.md) · [Conformance](../conformance/README.md)
