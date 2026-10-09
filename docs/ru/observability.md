# Диагностика без платёжных данных

> [English](../observability.md)

`observeCheckout` выдаёт небольшое категориальное событие для каждого engine event.
Он не отправляет запросы, не хранит события и не привязан к analytics vendor.
Куда и нужно ли их передавать, решает приложение.

```ts
import { observeCheckout } from '@checkout-kit/core'

const unsubscribe = observeCheckout(engine, (event) => {
  metrics.record('checkout', event)
})
// При закрытии экрана:
unsubscribe()
```

`metrics` — сервис вашего приложения. Подпишитесь один раз на engine; в React возвращайте
`unsubscribe` из effect cleanup. Ошибки observer обрабатываются как ошибки других engine
listeners; ваш logger не должен сериализовать чувствительные исключения.

| Событие                                       | Необязательные категориальные поля |
| --------------------------------------------- | ---------------------------------- |
| `phase_changed`                               | `phase`, `previous`                |
| `provider_changed`, `intent_created`, `error` | Нет                                |
| `action_required`                             | `actionKind`                       |
| `action_started`                              | `actionKind`, `surface`            |
| `action_finished`                             | `actionKind`, `via`                |
| `result`                                      | `status`                           |

Проекция допускает только известные enum values. Исключены order/payment/action/provider ids,
суммы, покупатель, карта, tokens, URL, error message/code и SDK/evidence payload.
Используется whitelist, а не попытка редактировать произвольный объект SDK.
`toCheckoutTelemetryEvent(event)` делает ту же проекцию, если вы уже используете `engine.on`.

Это данные о фазах и действиях checkout. После `result: processing` может прийти конечный
результат. Engine result не является settlement, fulfillment или revenue event: эти метрики
берутся из проверенного merchant state. Добавление собственных labels, identity или exception
reporting в callback возвращает ответственность за обработку таких данных вашему приложению.

[Безопасность платежей](./production.md) · [React lifecycle](./react.md)
