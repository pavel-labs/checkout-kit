# Stripe

> [English](../../providers/stripe.md)

Этот адаптер работает со Stripe PaymentIntents через **ваш** сервер. Карту принимает Stripe.js (поля самого Stripe) и возвращает id PaymentMethod. Вы передаёте только этот id. Данные карты через адаптер никогда не проходят.

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

## Что должен делать ваш сервер {#what-your-server-must-do}

Цены, проверка покупателя и секретный ключ Stripe — на вашем сервере. Возвращайте только поля `StripePaymentIntent` и привязывайте каждый платёж к авторизованному покупателю.

| Ваш маршрут                                          | Что делает в Stripe                            |
| ---------------------------------------------------- | ---------------------------------------------- |
| `POST /payments` с `{ planId }`                      | Создаёт PaymentIntent. Сумму назначает сервер. |
| `POST /payments/:id/confirm` с `{ paymentMethodId }` | Подтверждает этот платёж.                      |
| `GET /payments/:id`                                  | Читает его текущий статус.                     |
| `POST /payments/:id/cancel`                          | Отменяет платёж, если его ещё можно отменить.  |

Адаптер делает `Idempotency-Key` разным для каждой операции, чтобы создание, подтверждение и отмена не конфликтовали в Stripe. Передавайте этот заголовок в Stripe и не меняйте его, когда повторяете тот же запрос.

## Дополнительные шаги {#extra-steps}

Шаг `redirect_to_url` передаётся без изменений. Для `use_stripe_sdk` (например, 3D Secure внутри Stripe.js) зарегистрируйте адаптер SDK в runtime:

```ts
import { loadStripe } from '@stripe/stripe-js'
import { createStripeSdkAdapter } from '@checkout-kit/provider-stripe'

const stripe = loadStripe(publishableKey)
const adapter = createStripeSdkAdapter(async () => {
  const client = await stripe
  if (!client) throw new Error('Stripe.js could not be loaded.')
  return client
})
// createBrowserRuntime({ returnPath: '/payment/return', sdk: { adapters: [adapter] } })
```

- То, что сообщает SDK и что пришло в адресе возврата, — только подсказки. Прежде чем сообщить результат, адаптер читает ваш API.
- Клиентский секрет (client secret) передаётся только шагу. Он никогда не сохраняется ни в данных платежа, ни в хранилище для восстановления. Не пишите его в логи.

## Списание {#capture}

Используйте автоматическое списание. Если Stripe отвечает `requires_capture`, адаптер сообщает `capture_required`, и платёж остаётся «в обработке» — он никогда не считается успешным. Если нужно ручное списание, реализуйте списание и выдачу заказа на своём сервере.

## Тестирование {#testing}

Тесты контракта и формата запросов/ответов работают без ключей. Но перед приёмом платежей всё равно нужно проверить всё на своём тестовом аккаунте Stripe. См. [примеры интеграции](https://github.com/pavel-labs/checkout-kit/blob/main/examples/README.md).

## Поля карты и ответ сервера {#runnable-fields-and-merchant-dto}

Укажите **тестовые** ключи в серверной переменной `STRIPE_SECRET_KEY` и браузерной `VITE_STRIPE_PUBLISHABLE_KEY`. [StripeFields.tsx](../../../examples/react/StripeFields.tsx) принимает PaymentMethod через Stripe Elements и даёт адаптер SDK. Передайте движку раннеры и session storage; в [руководстве по React](../react.md) показана готовая страница.

Ваш сервер возвращает [StripePaymentIntent](../../../packages/provider-stripe/src/provider.ts) с полями: id, сумма целым числом, валюта, статус, безопасная ошибка и `next_action`. Клиентский секрет относится только к шагу проверки банком.

Как понимаются статусы:

- `succeeded` — оплачено;
- `processing` — движок продолжает проверять статус;
- `requires_capture` — результат остаётся неясным, пока вы не спишете деньги;
- при отказе сохраняется текст самого банка;
- неподдерживаемые шаги завершаются понятной ошибкой.

Прочитайте платёж, прежде чем его менять; отмена не может перезаписать успешный платёж. На своём тестовом аккаунте проверьте проверки банком, перенаправления и потерянные ответы, а также сверку платежей, когда браузер был закрыт.

[Сервер мерчанта](../merchant-integration.md) · [Восстановление](../runtime.md) · [Stripe PaymentIntents](https://docs.stripe.com/payments/payment-intents)
