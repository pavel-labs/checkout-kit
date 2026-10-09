# Интеграция сервера мерчанта

> [English](../merchant-integration.md)

[HTTP-пример](../../examples/server/README.md) реализует границы Stripe, Adyen, PayPal. Запустите его локально, затем замените демонстрационное хранилище и сессии своим сервером заказов.

## Режимы и настройки

`npm run dev:integration` запускает локальные gateways и React. `npm run dev:server -w @checkout-kit/examples` вызывает настроенные test/sandbox API. Без ключей провайдер отключён; `/health` сообщает режим.

| Где | Переменная | Назначение |
| --- | --- | --- |
| Сервер | `PORT`, `CHECKOUT_HOST` | Адрес, по умолчанию 4000 / 127.0.0.1. |
| Сервер | `CHECKOUT_ORIGIN` | Origin приложения, обычно `http://localhost:5173`. |
| Сервер | `CHECKOUT_RETURN_URL` | Возврат мерчанта, обычно `http://localhost:5173/payment/return`. |
| Сервер | `STRIPE_SECRET_KEY` | Test secret Stripe. |
| Сервер | `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT` | Test account Adyen. |
| Сервер | `ADYEN_WEBHOOK_HMAC_KEY` | Проверка стандартных уведомлений. |
| Сервер | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Sandbox app PayPal. |
| Браузер | `VITE_REAL_PROVIDER_API_BASE_URL` | API мерчанта, обычно `http://localhost:4000`. |
| Браузер | `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_ADYEN_CLIENT_KEY` | Публичные test keys полей/SDK. |

Для SameSite=Lax cookies используйте одинаковый hostname app/API. Браузерные переменные публичны, секреты остаются на сервере. См. [провайдеры](./packages.md#named-provider-adapters).

## Маршруты

| Маршрут | Назначение |
| --- | --- |
| `/stripe/payments` | Создание, confirm, чтение и отмена PaymentIntents. |
| `/adyen/payments/sessions` | Заказ мерчанта для Advanced flow. |
| `/adyen/payments/:id`, `/:id/details`, `/:id/cancel` | Components/details, чтение состояния, отмена. |
| `/adyen/webhooks` | Проверенные уведомления. |
| `/paypal/orders`, `/:id`, `/:id/capture` | Создание, чтение и capture Orders v2. |

JSON-мутации используют `Idempotency-Key`. Replay связан с session/method/path; concurrent duplicates получают один результат, изменённый payload — 409. Provider keys имеют отдельный scope/hash. Суммы и return URL клиента игнорируются.

Чужая сессия не может читать или менять заказ. UUID cookie демонстрирует изоляцию и не заменяет аутентификацию.

## Что заменить

| Пример | В приложении |
| --- | --- |
| Заказы в памяти | Постоянные price, buyer, provider reference и payment records. |
| UUID cookie | Login/session приложения и CSRF policy. |
| Replay в процессе | Постоянный scoped key, fingerprint, атомарная блокировка/результат. |
| Каталог `1id` / `2id` | Авторитетная цена ваших заказов/товаров. |
| Action data в памяти | Связанные и защищённые данные, переживающие restart/redirect. |
| Проверки из браузера | Серверная сверка и уведомления после закрытия браузера. |

Храните решение и результат вместе; сохраняйте ключ при неизвестном сетевом исходе. Confirm, capture, cancel и webhooks обеспечивают переходы атомарно, включая разные процессы.

## Уведомления и выдача заказа

Adyen проверяет HMAC официальным validator, account и сумму/валюту; старые события игнорируются. Некорректный batch не применяется частично. В постоянном хранилище сохраняйте порядок и историю replay.

Пример читает Stripe/PayPal для браузерного потока. Приложение также сверяет оплату без возвращающегося браузера и выдаёт заказ по проверенному состоянию. Capture policy должна соответствовать mapping статуса. UI success подходит для отображения/навигации.

## Проверка границы

Проверьте success, отказ, processing, challenge/redirect, duplicate/changed mutations, потерянный ответ, чужую сессию, webhook mismatch и outage recovery. Используйте [fixtures/browser tests](./testing.md) и реальный sandbox аккаунта.

[HTTP-код](../../examples/server/app.ts) · [SDK gateways](../../examples/server/gateways.ts) · [Восстановление](./runtime.md)
