# Adyen

> [English](../../providers/adyen.md)

## Инструмент, SDK и сервер

`@checkout-kit/provider-adyen` реализует Advanced flow. Component onSubmit возвращает state.data; передайте его как `wallet` с walletId `adyen`. Пересылаются paymentMethod, browserInfo, origin; цена/account/reference/return URL принадлежат серверу. Token означает storedPaymentMethodId; raw card применяется только в разрешённой мерчанту схеме сбора.

Настройки server: `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_WEBHOOK_HMAC_KEY`; browser: `VITE_ADYEN_CLIENT_KEY`. [AdyenFields.tsx](../../../examples/react/AdyenFields.tsx) показывает components и additional details. BaseUrl включает `/api/adyen`.

[AdyenPayment](../../../packages/provider-adyen/src/provider.ts) содержит merchant id, integer amount/currency, resultCode, action и refusal fields. Authorised отображается как succeeded: согласуйте capture/fulfillment. Пример не реализует manual capture; Pending/Received остаются processing.

Поддержаны redirect, threeDS2, threeDS2Fingerprint, threeDS2Challenge. Остальные action shapes требуют реализации. SDK получает params.action и resolve из onAdditionalDetails со state.data; mount не завершает authentication. PaymentData связывает сервер.

Уведомления проверяются official HMAC validator, account, суммой/валютой и порядком. Невалидный batch не применяется частично. Замените process-local state постоянным хранилищем.

## Регистрация

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

Импорт config-типа регистрирует id; динамический import загружает реализацию. Пример кода использует checkout как созданный вами engine. [React](../react.md) показывает runners, UI и восстановление.

## Точный API-контракт

Маршруты ниже относительны baseUrl; цена и ownership проверяются мерчантом. DTO названия сохранены из протокола:

| Merchant endpoint                               | Operation                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `POST /payments/sessions` with `{ planId }`     | Reserve a merchant order (not Adyen's Sessions API)                 |
| `POST /payments/:id`                            | Call Adyen `/payments` with merchant-owned price and component data |
| `POST /payments/:id/details` with `{ details }` | Call `/payments/details`, binding merchant-stored paymentData       |
| `GET /payments/:id`                             | Read authoritative merchant state, updated by verified webhooks     |
| `POST /payments/:id/cancel`                     | Cancel using the provider reference when one exists                 |

Проверяйте конечное состояние перед мутацией; cancel не переписывает paid. Сервер атомарно обеспечивает scoped-idempotency; callback не доказывает оплату. Установите runtime storage и hydrate на return route.

## Проверка аккаунта

Fixtures проверяют код; отдельно проверьте sandbox collection, authentication/approval, processing, redirect, потерянный ответ, buyer isolation и уведомления. [Merchant server](../merchant-integration.md) описывает постоянное состояние и выдачу заказа.

[Восстановление](../runtime.md) · [Тестирование](../testing.md) · [README пакета](../../../packages/provider-adyen/README.md)
