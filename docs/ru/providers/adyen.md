# Adyen

> [English](../../providers/adyen.md)

Этот адаптер работает со схемой **Advanced flow** от Adyen через ваш сервер. Поддерживает перенаправления, шаги 3DS2 в SDK Adyen, сохранённые способы оплаты и зашифрованные данные из компонентов Adyen Web.

## Установка из npm

```sh
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-adyen @adyen/adyen-web
```

[Пакет в npm](https://www.npmjs.com/package/@checkout-kit/provider-adyen) · [Все варианты установки](../getting-started.md#install-from-npm)

```ts
import { defineProvider } from '@checkout-kit/core'
import type { AdyenConfig } from '@checkout-kit/provider-adyen'

const registration = defineProvider({
  id: 'adyen',
  config: { baseUrl: '/api/adyen', sdk: 'adyen' } satisfies AdyenConfig,
  load: () => import('@checkout-kit/provider-adyen'),
})

// `state.data` is supplied by your Adyen Web component's onSubmit callback.
await checkout.pay({
  input: { planId: 'starter' },
  instrument: { kind: 'wallet', walletId: 'adyen', payload: state.data },
})
```

## Что отправляется и данные карты {#what-is-sent}

Из данных компонента на ваш сервер уходят только `paymentMethod`, `browserInfo` и `origin`. Сумму, валюту, аккаунт мерчанта, номер заказа и адрес возврата задаёт ваш сервер.

Инструмент `token` означает сохранённый способ оплаты (`storedPaymentMethodId`).

Данные карты в открытом виде **по умолчанию запрещены**: инструмент `card` и `number`/`cvc` внутри данных компонента отклоняются. Ставьте `allowRawCardData: true`, только если ваш аккаунт Adyen и ваши договорённости по соответствию требованиям прямо это разрешают. Этот флаг — не сертификация PCI. Пример сервера всегда отклоняет данные карты в открытом виде.

## Что должен делать ваш сервер {#what-your-server-must-do}

| Ваш маршрут                                  | Что делает                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| `POST /payments/sessions` с `{ planId }`     | Резервирует заказ на вашей стороне. (Это **не** Sessions API от Adyen.)         |
| `POST /payments/:id`                         | Вызывает `/payments` в Adyen с ценой сервера и данными компонента.              |
| `POST /payments/:id/details` с `{ details }` | Вызывает `/payments/details`, добавляя `paymentData`, сохранённый на сервере.   |
| `GET /payments/:id`                          | Читает настоящее состояние на вашем сервере. Его обновляют проверенные вебхуки. |
| `POST /payments/:id/cancel`                  | Отменяет платёж по ссылке провайдера, если она есть.                            |

Возвращайте только безопасную часть данных: `AdyenPayment`.

## Дополнительные шаги {#extra-steps}

- Адреса перенаправления и поля форм передаются без изменений.
- Полный шаг 3DS2 передаётся вашему адаптеру SDK как `params.action`.
- Адаптер должен показать компонент Adyen и вернуть `state.data` из `onAdditionalDetails`. **Не** возвращайте результат, когда компонент только появился на экране.
- Плагин распаковывает `details`. Он не доверяет `paymentData`, присланному из браузера.

Поддерживаемые типы шагов: `redirect`, `threeDS2`, `threeDS2Fingerprint`, `threeDS2Challenge`. Другие виды (региональные способы, QR-коды, другие SDK) требуют доработки. Не рассчитывайте, что поддерживаются все способы оплаты вашего аккаунта. Неизвестные шаги завершаются понятной ошибкой, а не делают вид, что работают.

Установите и подключите официальный SDK Adyen Web в своём приложении. `scriptUrl` необязателен — для приложений, которые уже сами загружают скрипт.

## Статусы и вебхуки {#statuses-and-webhooks}

Движок связывает результат каждого шага с этим шагом. Ваш сервер тоже должен связывать его с заказом и покупателем.

- `Authorised` означает «успешно». Списание и выдачу заказа настройте в соответствии с этим. Ручного списания в примере нет.
- `Pending` и `Received` остаются «в обработке».
- Способам оплаты, которые завершаются позже, нужен вебхук. Этот пакет не придумывает адрес для проверки статуса, которого нет в API Adyen.

Храните `paymentData` на сервере. Сервер проверяет подпись HMAC у вебхука, аккаунт, сумму, валюту и порядок событий. Замените хранение в памяти из примера на базу данных.

## Настройка и тестирование {#component-and-action-integration}

Для тестового аккаунта укажите серверные переменные `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_WEBHOOK_HMAC_KEY` и браузерную `VITE_ADYEN_CLIENT_KEY`. [AdyenFields.tsx](../../../examples/react/AdyenFields.tsx) собирает данные компонента и возвращает дополнительные данные.

Ваш сервер возвращает [AdyenPayment](../../../packages/provider-adyen/src/provider.ts): ваш собственный id платежа, сумму целым числом, валюту, `resultCode`, необязательный шаг и безопасную причину отказа.

Тесты контракта и формата запросов/ответов работают на сохранённых тестовых данных, а не на настоящем аккаунте Adyen. Серверная часть описана в [README пакета](../../../packages/provider-adyen/README.md) и в разделе [тестирование](../testing.md).

[Сервер мерчанта](../merchant-integration.md) · [Восстановление](../runtime.md) · [Adyen Advanced flow](https://docs.adyen.com/online-payments/web-drop-in/advanced-flow)
