# @checkout-kit/testing

Test data and simulators for developing a checkout. Nothing here calls real provider accounts or makes real payments.

## Install from npm

```bash
npm install @checkout-kit/core
npm install --save-dev @checkout-kit/testing
```

[npm package](https://www.npmjs.com/package/@checkout-kit/testing) · [Installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html#install-from-npm)

For the `/backend` import, also install its optional peer: `npm install --save-dev msw@^2.15.0`. The root and `/engine` imports do not need MSW.

| Import                          | What is inside                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `@checkout-kit/testing`         | `SCENARIO_CARDS` (test cards), outcomes and decline messages. No fake server.       |
| `@checkout-kit/testing/engine`  | `createFakeProvider`, `fakeIntent` / `fakeAction`, scripted runners, abort helpers. |
| `@checkout-kit/testing/backend` | MSW request handlers, `resetBackend` and a simulated merchant server state.         |

## Testing the engine

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

With the fake provider you can set the results of `confirm` and `resume`, slow down create and read responses, and look at the recorded calls. This lets you check retries, cancels and your app's lifecycle without any network.

## Fake server (MSW)

You need MSW 2 only for the `/backend` import.

- In Node, register its handlers with `setupServer`.
- In the browser demo, start them explicitly with `setupWorker`.
- `resetBackend` clears the test state.

In Node the state lives in memory. The browser demo keeps the simulated state in session storage, so it survives full-page redirects. It is still only a simulator — not an application database and not a real server with logins. Test cards and tokens never go to real payment APIs.

The [demo setup file](https://github.com/pavel-labs/checkout-kit/blob/main/apps/demo/src/app/providers/checkout.ts) registers all six example protocols. The [testing guide](https://pavel-labs.github.io/checkout-kit/testing.html) explains the difference between test data, HTTP integration tests, browser scenarios and checks on a real sandbox account.

[Русская версия](https://github.com/pavel-labs/checkout-kit/blob/main/packages/testing/README.ru.md) · [Conformance](https://github.com/pavel-labs/checkout-kit/blob/main/packages/conformance/README.md)
