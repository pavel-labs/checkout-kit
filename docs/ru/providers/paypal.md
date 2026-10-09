# PayPal

> [English](../../providers/paypal.md)

## Подтверждение и capture

`@checkout-kit/provider-paypal` использует Orders v2. Инструмент `{ kind: 'none' }`; approval link открывается в top window, браузерный SDK не нужен. Server `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` — из sandbox app. BaseUrl указывает на корень API, например `/api`; адаптер добавляет `/paypal/orders`.

[PayPalOrder](../../../packages/provider-paypal/src/provider.ts): id, integer amount, currency, status, approveUrl, captureStatus. Сервер проверяет принадлежность capture заказу, сумму и валюту. Approval разрешает capture, completed capture даёт succeeded, pending capture — processing, отсутствующие данные — `capture_unverified`. Declined/denied/failed capture — отказ.

Create/capture используют отдельные PayPal-Request-Id; сохраняйте их после потери ответа. Адаптер отвергает чужой token, читает заказ до capture и не списывает completed повторно. После потерянного capture reply пробует прочитать авторитетный результат.

Fake cancel API отсутствует: abort останавливает локальный поток, сервер хранит исход. Authorization/void — другой контракт. Продолжайте сверку после закрытия браузера.

## Регистрация

```ts
import { defineProvider } from '@checkout-kit/core'
import type { PayPalConfig } from '@checkout-kit/provider-paypal'

const registration = defineProvider({
  id: 'paypal',
  config: { baseUrl: '/api' } satisfies PayPalConfig,
  load: () => import('@checkout-kit/provider-paypal'),
})

await checkout.pay({ input: { planId: 'starter' }, instrument: { kind: 'none' } })
```

Импорт config-типа регистрирует id; динамический import загружает реализацию. Пример кода использует checkout как созданный вами engine. [React](../react.md) показывает runners, UI и восстановление.

## Точный API-контракт

Маршруты ниже относительны baseUrl; цена и ownership проверяются мерчантом. DTO названия сохранены из протокола:

| Merchant endpoint                       | Operation                                                         |
| --------------------------------------- | ----------------------------------------------------------------- |
| `POST /paypal/orders` with `{ planId }` | Create an order with server-owned price and `intent: CAPTURE`     |
| `GET /paypal/orders/:id`                | Retrieve the order and its capture state                          |
| `POST /paypal/orders/:id/capture`       | Capture an approved order, replaying the same request id on retry |

Проверяйте конечное состояние перед мутацией; cancel не переписывает paid. Сервер атомарно обеспечивает scoped-idempotency; callback не доказывает оплату. Установите runtime storage и hydrate на return route.

## Проверка аккаунта

Fixtures проверяют код; отдельно проверьте sandbox collection, authentication/approval, processing, redirect, потерянный ответ, buyer isolation и уведомления. [Merchant server](../merchant-integration.md) описывает постоянное состояние и выдачу заказа.

[Восстановление](../runtime.md) · [Тестирование](../testing.md) · [README пакета](../../../packages/provider-paypal/README.md)
