# Тестирование интеграции

> [English](../testing.md)

Есть три уровня проверок, и каждый находит свои проблемы:

- **фикстуры** (сохранённые тестовые данные) проверяют, что адаптер правильно говорит на протоколе провайдера;
- **симуляторы** (поддельные провайдеры) проверяют, что весь сценарий оплаты работает в вашем приложении;
- **ваш тестовый аккаунт** у настоящего провайдера (песочница) проверяет настоящий SDK и настройки аккаунта.

## Установка из npm

```sh
npm install @checkout-kit/core
npm install --save-dev @checkout-kit/testing
```

[Пакет в npm](https://www.npmjs.com/package/@checkout-kit/testing) · [Все варианты установки](./getting-started.md#install-from-npm)

Для `/backend` добавьте MSW; для контрактных тестов — conformance и Vitest:

```sh
npm install --save-dev @checkout-kit/conformance msw@^2.15.0 vitest@^5.0.0
```

[Conformance в npm](https://www.npmjs.com/package/@checkout-kit/conformance)

## Проверки в этом репозитории {#repository-checks}

| Команда                                                    | Что проверяет                                                                                                                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                                 | Движок, пример HTTP-сервера, контракты провайдеров, React/UI, раннеры и мост для мобильных приложений.                                                                                  |
| `npm run test:e2e`                                         | Шесть протоколов-примеров в настоящем браузере, со сценариями под каждую возможность.                                                                                                   |
| `npm run test:integration`                                 | Stripe, Adyen и PayPal через HTTP-сервер: подтверждение, отказ, опрос статуса, перенаправление, списание и повтор.                                                                      |
| `npm run typecheck` / `npm run examples:typecheck`         | Типы пакетов и примеров, которые их используют.                                                                                                                                         |
| `npm run verify:consumer`                                  | Ставит все 16 архивов, а также небольшие наборы без React и с React, в чистый проект. Проверяет строгие типы, экспорты, оплату в Node, SSR и то, что повреждённые загрузки отклоняются. |
| `npm run lint` / `npm run format:check` / `npm run purity` | Стиль кода и то, что в ядре и в нативных точках входа нет кода только для браузера.                                                                                                     |
| `npm run docs:api` / `npm run docs:build`                  | Собирает справочник API из объявлений типов, собирает сайт и проверяет страницы и ссылки.                                                                                               |

Браузерным тестам нужен Playwright с Chromium. Локально один раз выполните `npx playwright install chromium`; в CI он ставится сам. Перед генерацией справочника API соберите объявления типов.

## Помощники для тестов {#test-helpers}

| Импорт                          | Что внутри                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `@checkout-kit/testing`         | Тестовые карты для каждого сценария и тексты отказов. Без поддельного сервера.        |
| `@checkout-kit/testing/engine`  | Поддельные провайдеры, раннеры с заданным сценарием, готовые данные платежей и шагов. |
| `@checkout-kit/testing/backend` | Обработчики запросов MSW и состояние платежей, которое можно сбросить.                |
| `@checkout-kit/conformance`     | Набор тестов Vitest для провайдеров. Нужны core, testing, MSW 2 и Vitest 5.           |

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

Что означают части:

- `instrumentFor` возвращает то, «чем платит» покупатель в каждом тестовом сценарии;
- `evidenceFor` возвращает то, что пришло бы после дополнительного шага. Функция может сначала выполнить шаг симулированного банка, а потом вернуть соответствующие данные;
- ваши собственные обработчики могут задать `reset: async () => { ... }` — он вызывается перед каждым тестом.

## Что проверяет контракт {#what-the-contract-requires}

Набор тестов проверяет, что плагин соблюдает правила:

- то, что плагин заявляет как поддерживаемое, совпадает с тем, как он на самом деле работает с инструментами и шагами;
- повторное «создать» с тем же ключом возвращает тот же платёж;
- настоящие суммы, текст отказа от банка и состояние «в обработке» передаются без изменений;
- ошибки возвращаются как данные об ошибке, а не выбрасываются исключением;
- поля карты никогда не возвращаются в ответах;
- неизвестный шаг завершается ошибкой, и правильные данные от **другого** заказа — тоже;
- повтор одного и того же «продолжить» не может списать деньги дважды;
- «подтвердить» не может заново открыть успешный платёж;
- «отменить» не может перезаписать оплаченный платёж.

Ваш сервер должен обеспечивать те же правила атомарно. Чтение данных в адаптере — это не блокировка в базе данных.

## Поддельное состояние и проверка на аккаунте {#mock-state-and-account-checks}

В тестах на Node фикстуры сбрасывают свои данные в памяти. В браузерном демо симулированное состояние хранится в session storage, чтобы пережить перенаправления всей страницы; `resetBackend()` его очищает. Никогда не используйте тестовые токены и тестовые карты в настоящих запросах.

На своём настоящем тестовом аккаунте проверьте: ввод карты через SDK, проверку банком, страницу возврата, списание, проверенные вебхуки, потерянные ответы и закрытый браузер. Следуйте [руководству провайдера](./packages.md#named-provider-adapters) и разделу [сервер мерчанта](./merchant-integration.md).
