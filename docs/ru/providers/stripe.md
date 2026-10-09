# Stripe

> [English](../../providers/stripe.md)

## Инструмент, SDK и сервер

`@checkout-kit/provider-stripe` принимает PaymentMethod token из Stripe.js. [StripeFields.tsx](../../../examples/react/StripeFields.tsx) показывает Elements и SDK actions. Server `STRIPE_SECRET_KEY` и browser `VITE_STRIPE_PUBLISHABLE_KEY` задаются test keys.

В baseUrl используется префикс `/api/stripe`. Цена и владелец определяются сервером. Возвращайте [StripePaymentIntent](../../../packages/provider-stripe/src/provider.ts): id, integer amount, currency, status, безопасный error и next_action. Client secret передаётся только authentication action и не сохраняется в intent/storage/logs.

Для use_stripe_sdk зарегистрируйте `createStripeSdkAdapter` с загруженным Stripe.js и передайте его в runtime sdk.adapters. Redirect URL сохраняется. SDK/return — evidence; итог определяется чтением API.

Succeeded — успех; processing проверяется polling; requires_capture возвращает `capture_required` с processing intent, не оплатой. Пример использует automatic capture. Ручное списание и выдача заказа требуют процесса на сервере.


## Регистрация

```ts
import { defineProvider } from '@checkout-kit/core'
import type { StripeConfig } from '@checkout-kit/provider-stripe'

const registration = defineProvider({
  id: 'stripe',
  config: { baseUrl: '/api/stripe' } satisfies StripeConfig,
  load: () => import('@checkout-kit/provider-stripe'),
})

// After Stripe.js creates the PaymentMethod:
await checkout.pay({
  input: { planId: 'starter' },
  instrument: { kind: 'token', token: paymentMethod.id },
})
```

Импорт config-типа регистрирует id; динамический import загружает реализацию. Пример кода использует checkout как созданный вами engine. [React](../react.md) показывает runners, UI и восстановление.

## Точный API-контракт

Маршруты ниже относительны baseUrl; цена и ownership проверяются мерчантом. DTO названия сохранены из протокола:

| Merchant endpoint                                       | Stripe operation                                  |
| ------------------------------------------------------- | ------------------------------------------------- |
| `POST /payments` with `{ planId }`                      | Create a PaymentIntent with a server-owned amount |
| `POST /payments/:id/confirm` with `{ paymentMethodId }` | Confirm that intent                               |
| `GET /payments/:id`                                     | Retrieve its current status                       |
| `POST /payments/:id/cancel`                             | Cancel a cancelable intent                        |


Проверяйте конечное состояние перед мутацией; cancel не переписывает paid. Сервер атомарно обеспечивает scoped-idempotency; callback не доказывает оплату. Установите runtime storage и hydrate на return route.

## Проверка аккаунта

Fixtures проверяют код; отдельно проверьте sandbox collection, authentication/approval, processing, redirect, потерянный ответ, buyer isolation и уведомления. [Merchant server](../merchant-integration.md) описывает постоянное состояние и выдачу заказа.

[Восстановление](../runtime.md) · [Тестирование](../testing.md) · [README пакета](../../../packages/provider-stripe/README.md)
