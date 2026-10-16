# @checkout-kit/testing

Тестовые данные и симуляторы для разработки оплаты. Ничто здесь не обращается к настоящим аккаунтам провайдеров и не проводит настоящих платежей.

| Импорт                          | Что внутри                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@checkout-kit/testing`         | `SCENARIO_CARDS` (тестовые карты), исходы и тексты отказов. Без поддельного сервера.                   |
| `@checkout-kit/testing/engine`  | `createFakeProvider`, `fakeIntent` / `fakeAction`, раннеры с заданным сценарием, помощники для отмены. |
| `@checkout-kit/testing/backend` | Обработчики запросов MSW, `resetBackend` и состояние симулированного сервера мерчанта.                 |

## Проверка движка

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

С поддельным провайдером можно задавать результаты `confirm` и `resume`, замедлять ответы на создание и чтение и смотреть записанные вызовы. Так можно проверить повторы, отмену и жизненный цикл приложения без сети.

## Поддельный сервер (MSW)

MSW 2 нужен только для импорта `/backend`.

- В Node зарегистрируйте его обработчики через `setupServer`.
- В браузерном демо запускайте их явно через `setupWorker`.
- `resetBackend` очищает тестовое состояние.

В Node состояние хранится в памяти. Браузерное демо сохраняет симулированное состояние в session storage, чтобы оно пережило перенаправление всей страницы. Это всё равно только симулятор — не база данных приложения и не настоящий сервер со входом пользователей. Тестовые карты и токены никогда не уходят в настоящие платёжные API.

[Файл настройки демо](https://github.com/pavel-labs/checkout-kit/blob/main/apps/demo/src/app/providers/checkout.ts) регистрирует все шесть протоколов-примеров. В [руководстве по тестированию](https://pavel-labs.github.io/checkout-kit/ru/testing.html) объяснена разница между тестовыми данными, интеграционными HTTP-тестами, сценариями в браузере и проверкой на настоящем тестовом аккаунте.

[English](https://github.com/pavel-labs/checkout-kit/blob/main/packages/testing/README.md) · [Conformance](https://github.com/pavel-labs/checkout-kit/blob/main/packages/conformance/README.md)
