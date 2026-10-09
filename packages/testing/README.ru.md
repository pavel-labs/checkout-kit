# @checkout-kit/testing

Fixtures и симуляторы для разработки чекаута. Они не вызывают аккаунты провайдеров и не проводят реальные платежи.

| Entry point | Экспорты |
| --- | --- |
| `@checkout-kit/testing` | SCENARIO_CARDS, outcomes, тексты отказов без backend. |
| `@checkout-kit/testing/engine` | createFakeProvider, fakeIntent/action, scripted runners, abort helpers. |
| `@checkout-kit/testing/backend` | MSW handlers, resetBackend, состояние симулятора мерчанта. |

## Проверка движка

~~~ts
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
~~~


Настраивайте confirm/resume outcomes, задерживайте create/read и проверяйте calls для retries, abort и времени жизни хоста без сети.

## MSW backend

MSW 2 нужен для /backend. В Node зарегистрируйте handlers в setupServer, в демо — явно setupWorker; resetBackend очищает fixture.

Node хранит state в памяти; browser demo сохраняет симулятор в session storage для top redirect. Это не база приложения и не аутентифицированный сервер оплаты. Mock cards/tokens не передаются реальным API.

[Точка сборки](../../apps/demo/src/app/providers/checkout.ts) регистрирует шесть протоколов. [Тестирование](https://pavel-labs.github.io/checkout-kit/ru/testing.html) разделяет fixtures, HTTP/browser сценарии и sandbox аккаунта.

[English](./README.md) · [Conformance](../conformance/README.md)
