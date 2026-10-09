# Проверка интеграции

> [English](../testing.md)

Fixtures проверяют протокол, симуляторы — жизненный цикл приложения, sandbox выбранного аккаунта — его SDK и настройки.

## Проверки репозитория

| Команда                                                    | Проверяет                                                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`                                                 | Движок, HTTP-сервер, контракты провайдеров, React/UI, runners, bridge.                                                         |
| `npm run test:e2e`                                         | Шесть референсных протоколов в браузере, с учётом capabilities.                                                                |
| `npm run test:integration`                                 | Stripe/Adyen/PayPal через HTTP: подтверждение, отказ, polling, возврат, capture, повторы.                                      |
| `npm run typecheck` / `npm run examples:typecheck`         | Типы пакетов и примеров.                                                                                                       |
| `npm run verify:consumer`                                  | Все 16 архивов и минимальные headless/React наборы; строгие типы, exports, Node checkout, SSR и отказ при повреждённом архиве. |
| `npm run lint` / `npm run format:check` / `npm run purity` | Код и отсутствие browser globals в core/native entry points.                                                                   |
| `npm run docs:api` / `npm run docs:build`                  | API из деклараций, сборка сайта, проверка страниц и anchors.                                                                   |

Для браузера нужен Chromium: `npx playwright install chromium`; CI устанавливает его. До генерации API соберите декларации.

## Тестовые пакеты

| Entry point                     | Назначение                                                |
| ------------------------------- | --------------------------------------------------------- |
| `@checkout-kit/testing`         | Карты и тексты отказов без mock server.                   |
| `@checkout-kit/testing/engine`  | Fake providers, scripted runners, intent/action fixtures. |
| `@checkout-kit/testing/backend` | MSW handlers и сбрасываемое состояние оплаты.             |
| `@checkout-kit/conformance`     | Vitest-контракт; peers core, testing, MSW 2, Vitest 5.    |

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

Свой fixture передаёт `reset: async () => { ... }` перед каждым тестом. `evidenceFor` может сначала выполнить действие симулятора банка, затем вернуть связанные данные.

## Требования контракта

Capabilities соответствуют поведению. Creation key воспроизводит intent; реальные суммы, текст эмитента и processing сохраняются. Ошибки возвращаются данными, поля карты не копируются в результаты.

Неизвестное действие и evidence чужого заказа отвергаются. Повтор resume не списывает дважды; confirm/cancel не переписывают success. Сервер соблюдает эти условия атомарно: чтение адаптера не заменяет блокировку БД.

## Состояние симулятора и sandbox

Node fixtures сбрасывают хранилища в памяти. Демо в браузере сохраняет simulated state в session storage для возврата после top redirect; `resetBackend()` очищает его. Mock-карты/токены не используются в настоящих запросах.

В аккаунте проверяйте SDK, authentication, return route, capture, verified webhooks, потерянные ответы и закрытие браузера. См. [провайдеры](./packages.md#named-provider-adapters) и [сервер мерчанта](./merchant-integration.md).
