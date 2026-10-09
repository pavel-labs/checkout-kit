# Чекаут на React

> [English](../react.md)

`@checkout-kit/react` связывает движок приложения с React 19. API мерчанта и сбор инструмента остаются у приложения. Необязательный UI-кит добавляет компоненты; bindings работают и со своей дизайн-системой.

## Полный небольшой пример {#complete-example}

Скопируйте модули в `quickstart-engine.ts` и `quickstart.tsx`. Их проверяет TypeScript-сборка examples. Подключите [API PayPal](./providers/paypal.md), создайте движок один раз в браузере и используйте [код старта](./getting-started.md#connect-your-app).

Сборка движка:

<<< @/../examples/react/quickstart-engine.ts

React-экран:

<<< @/../examples/react/quickstart.tsx

Цена определяется сервером по `planId`. `Money` отображает ответ; `PaymentActionHost` выполняет redirect. При неопределённой ошибке повторяется восстановление/та же попытка. Сброс доступен только для проверенного конечного intent, сохраняя идентичность неизвестного платежа.

## Время жизни движка

Создавайте один движок на чекаут вне обычного рендера. Новый движок на каждом render теряет подписки и текущую оплату. Сохраняйте action host смонтированным, пока выполняется видимый раннер.

`CheckoutProvider` даёт context, `CheckoutRoot` — CSS theme, density и platform. Полностью своему UI достаточно provider.

## Подписки

| Hook                                         | Результат                                                          |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `useCheckoutEngine()`                        | Команды без подписки.                                              |
| `useCheckoutSnapshot()`                      | Неизменяемые phase, intent, action, error, provider, capabilities. |
| `useCheckout()`                              | Snapshot, engine, `isBusy`, `isSettled`, `isLocked`.               |
| `useCheckoutSelector(selector, isEqual?)`    | Кешированный selector, включая объекты и своё равенство.           |
| `usePaymentState({ isDirty, isValidating })` | Состояние формы поверх движка.                                     |

```tsx
import { useCheckoutSelector } from '@checkout-kit/react'
const total = useCheckoutSelector(
  (s) => ({ amount: s.intent?.amount, currency: s.intent?.currency }),
  (a, b) => a.amount === b.amount && a.currency === b.currency,
)
```

Selectors должны быть чистыми. `isSettled` означает остановку автоматического продвижения, включая failed/неопределённую попытку; это не подтверждение оплаты. `isLocked` включает конечные фазы. Для восстановления и новой попытки используйте отдельное условие.

## Действия и восстановление

У `PaymentActionHost` по умолчанию включён `autoRun`. `surface` меняет поддержанную поверхность. `onSettled` подходит для UI/навигации; заказ выдаёт сервер. При `autoRun={false}` вызывайте `engine.runPendingAction` со своим mount.

Effects защищены от повторного запуска, включая цепочки с одинаковым action id. React/UI поддерживают SSR; browser runtime создаётся на клиенте. См. [runtime](./runtime.md) и [решение проблем](./troubleshooting.md).
