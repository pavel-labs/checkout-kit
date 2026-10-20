# Поля провайдера

> [English](../../plugins/hosted-fields.md)

`@checkout-kit/provider-hosted-fields` — **пример адаптера** для случая, когда у вас **поля карты от провайдера**, которые показываются во фрейме прямо на вашей странице. Ваш код никогда не видит номер карты, только токен.

- id провайдера: `hostedfields`.
- Чем платит покупатель (инструмент): не нужен — карту принимает фрейм провайдера.

Пакет показывает протокол сервера из примеров checkout kit. Используйте его как рабочий шаблон для своей интеграции вместе с поддельным сервером из `@checkout-kit/testing/backend`. Это **не** сертифицированный адаптер для какого-либо настоящего банка или платёжной системы. Для Stripe, Adyen и PayPal используйте их собственные пакеты.

## Установка из npm

```sh
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-hosted-fields
```

[Пакет в npm](https://www.npmjs.com/package/@checkout-kit/provider-hosted-fields) · [Все варианты установки](../getting-started.md#install-from-npm)

## Настройка {#configure}

Как установить пакеты, описано в [быстром старте](../getting-started.md#install-from-npm).

```ts
import { defineProvider } from '@checkout-kit/core'
import type { HostedFieldsConfig } from '@checkout-kit/provider-hosted-fields'

const config: HostedFieldsConfig = {
  baseUrl: '/api',
  fieldsUrl: 'https://fields.example.com/card',
  fieldsOrigin: 'https://fields.example.com',
}

const provider = defineProvider({
  id: 'hostedfields',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-hosted-fields'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

- `baseUrl` — адрес API вашего сервера.
- `headers` (необязательно) — заголовки вашей сессии или защиты от CSRF. `credentials` определяет, отправляются ли cookie.
- Секретные ключи платёжного сервиса храните на сервере.
- Браузерный runtime, адрес возврата и адаптер SDK (если нужен) даёт ваше приложение — см. [React](../react.md) и [работа в браузере](../runtime.md).

## API сервера {#merchant-api}

Пути ниже указаны относительно `baseUrl`. На своём сервере: авторизуйте покупателя, берите цену по `planId`, проверяйте, что заказ принадлежит этому покупателю, и разрешайте только допустимые смены статуса. Суммы — целые числа в минимальных единицах валюты (например, в копейках или центах).

| Метод | Путь                                | Что делает                                                    |
| ----- | ----------------------------------- | ------------------------------------------------------------- |
| POST  | `/hosted-fields/charges`            | Принимает `{ planId }`, возвращает списание.                  |
| GET   | `/hosted-fields/charges/:id`        | Возвращает настоящее состояние списания.                      |
| POST  | `/hosted-fields/charges/:id/pay`    | Принимает `{ token }`. Ваш сервер обменивает токен на деньги. |
| POST  | `/hosted-fields/charges/:id/cancel` | Отменяет ещё не завершённое списание.                         |

Ответы с платежом, заказом или списанием содержат `{ id, amount, currency, status, error? }`. Статусы — значения `PaymentStatus` из checkout kit. При отказе в `error` может быть `{ code?, message }`.

**Как это работает.** Фрейм провайдера получает параметры адреса `actionId` и `fields`. Он отвечает сообщением `ck-fields-token` (`postMessage`), в котором тот же `actionId` и непустой `token`. Runtime проверяет фрейм-отправитель и его точный origin. Адаптер тоже проверяет origin и id платежа. Ваш сервер должен проверить, кому принадлежит токен и не использовался ли он раньше.

## Повторы и проверка {#retries-and-verification}

Прежде чем снова открыть платёж, использовать другой токен или отменить, адаптер читает настоящий заказ с сервера. Успешные, отклонённые и отменённые заказы сохраняют свой результат. Для заказов в обработке статус продолжает проверяться. После потерянного ответа повтор сначала проверяет тот же заказ и только потом отправляет следующее изменение.

**Идемпотентность.** При создании `CallOptions.idempotencyKey` отправляется в заголовке `Idempotency-Key`. Для остальных изменений к ключу добавляются операция и id платежа (`:confirm:`, `:resume:`, `:pay:`, `:code:` или `:cancel:`). Ваш сервер должен учитывать ключ и отклонять запрос с тем же ключом, но другими данными. Один только заголовок не гарантирует единственное списание.

Тесты контракта и регрессии для этого пакета:

```sh
npm ci
npm test -- packages/provider-hosted-fields
```

## Запуск и проверка {#run-and-verify}

Запустите `npm run dev:mock` и `npm run dev:bank` или откройте [демо на сайте](/demo/). Проверьте успешную оплату, отказ, дополнительный шаг, обработку, повтор и данные от чужого заказа. Это пример протокола, а не интеграция с настоящим банком. [Окружение симулятора](./setup.md), [восстановление](../runtime.md) и [тестирование](../testing.md) объясняют остальное.

[Окружение](./setup.md) · [Восстановление](../runtime.md) · [Каталог](../packages.md)
