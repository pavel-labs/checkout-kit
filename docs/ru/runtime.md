# Runtime браузера и восстановление

> [English](../runtime.md)

`@checkout-kit/runtime-browser` выполняет действия. Движок управляет попыткой, раннер возвращает evidence, провайдер и сервер устанавливают исход.

## Настройка браузера

```ts
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
const runtime = createBrowserRuntime({ returnPath: '/checkout/payment/return' })
// Передайте в createCheckout runtime.runners, runtime.storage и runtime.returnUrl.
```

`returnPath` должен включать путь размещения приложения; он разрешается относительно текущего origin. Storage движка в памяти не переживает полный redirect: используйте runtime storage.

| Action           | Поведение                                                                 | Настройка хоста                             |
| ---------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| `redirect`       | GET/POST в iframe или верхнее окно, с исходными URL/полями.               | Mount для iframe; маршрут возврата для top. |
| `collect_fields` | Iframe провайдера возвращает непрозрачный токен через postMessage.        | Mount и точный frame origin.                |
| `sdk_handoff`    | Вызов зарегистрированного SDK adapter, при необходимости загрузка script. | Adapter с id `action.sdk`.                  |
| `display`        | QR/код/инструкция, пока движок проверяет заказ.                           | Mount, при необходимости URL QR провайдера. |

Headless-хост передаёт `createMount(element)` в `engine.runPendingAction({ mount })`. В React используется `PaymentActionHost`. Для popup требуется свой раннер.

## SDK и время жизни

```ts
const runtime = createBrowserRuntime({
  returnPath: '/checkout/return',
  sdk: {
    adapters: [
      {
        sdk: 'merchant-wallet',
        async request(params, signal) {
          return walletSdk.requestPayment(params, { signal })
        },
      },
    ],
  },
})
```

Хост реализует `walletSdk`. Возвращайте ожидаемый payload после результата SDK, а не после mount компонента. Для [Stripe](./providers/stripe.md) есть SDK adapter; [Adyen](./providers/adyen.md) возвращает additional details.

Скрипт переиспользуется по URL; противоречащие integrity settings отвергаются. Deadline и abort ограничивают ожидание; хост также закрывает интерфейс SDK по abort.

## Восстановление redirect

На маршруте возврата создайте тот же набор регистраций/storage:

```ts
const result = await engine.hydrate(runtime.readReturnParams())
```

Hydrate читает сохранённые provider, intent, action и перечитывает заказ. Проверенный конечный статус не требует нового confirm/capture. Evidence связано с сохранённым действием. При временном отказе API метаданные остаются: повторите hydrate с исходными параметрами.

Отдавайте приложение на точном return path, сохраняйте параметры и ту же session storage до завершения. Для другой вкладки/системного браузера восстановление организует хост.

## Попытки, повторы и отмена

| Ситуация                     | Операция                                                               |
| ---------------------------- | ---------------------------------------------------------------------- |
| Потерян ответ create/confirm | Повтор той же попытки/ключа и проверка прежнего intent.                |
| Processing                   | Polling того же intent; таймаут оставляет исход неизвестным.           |
| Проверенный отказ/отмена     | Новая оплата может создать новый intent/ключ.                          |
| Начать заново                | `reset()` очищает локальное состояние, не отменяя списание на сервере. |
| Отмена покупателем           | `abort()` останавливает работу и запрашивает отмену, если поддержана.  |
| Оплата успела завершиться    | Сохранить succeeded; UI не меняет историю оплаты.                      |

Движок сохраняет ключ прерванного create даже без полученного id и продолжает проверку прежнего processing intent. Сервер атомарно обеспечивает scoped-idempotency и переходы. Заказ выдаётся по постоянному проверенному состоянию, включая закрытый браузер.

## Storage и сообщения

Session storage хранит метаданные без полей карты, SDK-payload и client secret. Свой `StorageAdapter` реализует `read`, `write`, `remove` и разделяет сессии.

Evidence iframe проверяется по sender, origin, type и action id. Копирование/сканирование кода не подтверждает оплату: display завершается polling. При отказе clipboard код доступен для ручного копирования. DOM, listeners и timers раннера очищаются.

[WebView](./webview.md) описывает сессии и deep links; [решение проблем](./troubleshooting.md) — mount, SDK и восстановление.
