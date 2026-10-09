# Решение проблем

> [English](../troubleshooting.md)

Начните с phase, provider, intent id, action kind, error code и соответствующего API-запроса. Поля карты, токены, client secrets и SDK-ответы не пишутся в логи.

## Настройка

| Симптом                         | Проверка / исправление                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Загрузка неопубликованного peer | Установите архивы и peers одной командой: [установка](./getting-started.md#install-package-archives). |
| Нет CSS                         | Импортируйте `@checkout-kit/ui/styles.css`, используйте CheckoutRoot / .ck-root.                      |
| window error при SSR            | Runtime/bridge создаётся на клиенте, React/UI могут рендериться отдельно.                             |
| Неизвестный provider            | Импортируйте config type, зарегистрируйте фактические id и module.                                    |
| Нет cookie / API error          | Проверьте baseUrl, origin, credentials, hostname и session.                                           |

## Действия

| Симптом                              | Проверка / исправление                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Action pending без страницы          | PaymentActionHost либо runPendingAction.                                       |
| Нет mount                            | createMount(element) для iframe/inline; mount остаётся видимым.                |
| Нет SDK adapter                      | Его sdk совпадает с action.sdk: [гайд](./packages.md#named-provider-adapters). |
| SDK завершился раньше authentication | Resolve по результату/additional details, а не по mount.                       |
| Integrity conflict                   | Один URL/hash на session; смена после reload.                                  |
| Evidence iframe игнорируется         | Точные origin, sender, type, action id; без wildcard trust.                    |
| Unsupported action                   | Выберите поддержанную method либо реализуйте action.                           |
| QR не завершается                    | Серверное состояние, webhooks, polling; сканирование не доказывает оплату.     |

## Восстановление

| Симптом                   | Проверка / исправление                                                 |
| ------------------------- | ---------------------------------------------------------------------- |
| Return route 404          | Отдавайте app по точному deployed path.                                |
| Нет сохранённой попытки   | runtime.storage, та же session, без reset перед hydrate.               |
| API outage при возврате   | Сохраните параметры и повторите hydrate позже.                         |
| Processing timeout        | Проверьте прежний intent до нового списания.                           |
| Stripe capture_required   | Capture выполняет сервер; пример использует автоматический.            |
| PayPal capture_unverified | Проверенный capture status/amount/currency вместо одного order status. |
| Adyen Pending / Received  | HMAC, account, порядок webhook и постоянное состояние.                 |
| Evidence mismatch         | Данные сохранённого action именно этого заказа.                        |
| HTTP 409 replay           | Payload изменился под одним ключом; проверьте прежний результат.       |
| Retry disabled            | isLocked включает final phases; recovery имеет отдельное условие.      |

## Native bridge

Session берётся из PAYMENT_READY; command ids уникальны. createBridgeCommand / createCommandScript безопасно сериализуют injection. Stale/duplicate команды игнорируются; ping возвращает связанный ready.

onMessage принимается только от URL документа мерчанта. Разрешённая навигация банка не делает его источник авторитетным. Custom-scheme return передаётся как PAYMENT_RESUME и не загружается в WebView.

[Нативный пример](../../examples/react-native-checkout/README.md) сохраняет возврат до handshake и показывает ветвление навигации. Проверка браузера не заменяет сборку iOS/Android.

## Локализация сбоя

`npm run dev:integration` сравнивает аккаунт с локальным симулятором. Если он работает, проверьте sandbox/merchant/SDK; иначе — пакет и [контрактные тесты](./testing.md).
