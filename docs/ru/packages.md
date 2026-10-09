# Какие пакеты нужны

> [English](../packages.md)

Checkout kit содержит 16 отдельных ESM-пакетов. Начните с core, провайдера и хоста. Для браузера добавьте runners, для React 19 — bindings, при необходимости UI. Архивы содержат JavaScript и декларации; установка проверяется в отдельном приложении.

## Движок и хосты

| Пакет                           | Назначение                                                                              | Гайд                             |
| ------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------- |
| `@checkout-kit/core`            | Headless-движок, типы платежа, registry, store, восстановление и HTTP. Без DOM и React. | [Архитектура](./architecture.md) |
| `@checkout-kit/runtime-browser` | Redirect/iframe, hosted fields, SDK, display, session storage и return URL.             | [Runtime](./runtime.md)          |
| `@checkout-kit/react`           | Context, snapshot/selector hooks и action host для React 19.                            | [React](./react.md)              |
| `@checkout-kit/ui`              | Scoped CSS, поля, состояния и компонуемые раскладки чекаута.                            | [UI](./ui.md)                    |
| `@checkout-kit/webview-bridge`  | Сообщения, нативные команды, навигация и deep links. Host entry работает без DOM.       | [WebView](./webview.md)          |

## Адаптеры конкретных провайдеров {#named-provider-adapters}

Эти пакеты работают через аутентифицированный API мерчанта. Есть примеры SDK, запускаемый сервер, fixtures и браузерные тесты. Sandbox конкретного аккаунта проверяется отдельно.

| Пакет / id                   | Инструмент и поток                                                                                                              | Гайд                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `provider-stripe` / `stripe` | PaymentMethod token из Stripe.js; PaymentIntents, SDK/redirect, автоматический capture.                                         | [Stripe](./providers/stripe.md) |
| `provider-adyen` / `adyen`   | Зашифрованные component data, stored token или допустимая raw card; Advanced payments/details и проверенное состояние мерчанта. | [Adyen](./providers/adyen.md)   |
| `provider-paypal` / `paypal` | Без инструмента; подтверждение Orders v2 и проверенный capture на сервере.                                                      | [PayPal](./providers/paypal.md) |

Все пакеты используют scope `@checkout-kit/`.

## Референсные протоколы

Это исполняемые шаблоны своего API и адаптеры симулятора. Похожая форма потока не означает готовую поддержку Apple Pay, Google Pay или конкретного банка.

| Пакет / id                                | Демонстрирует                                      | Гайд                                      |
| ----------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| `provider-psp` / `psp`                    | JSON API, saved cards, 3DS2.                       | [PSP](./plugins/psp.md)                   |
| `provider-acquiring` / `acquiring`        | Form API, числовые статусы, 3DS1.                  | [Эквайер](./plugins/acquiring.md)         |
| `provider-hpp` / `hpp`                    | Платёжная страница и проверенный возврат.          | [Hosted page](./plugins/hosted-page.md)   |
| `provider-hosted-fields` / `hostedfields` | Iframe провайдера и непрозрачный токен.            | [Хостед-поля](./plugins/hosted-fields.md) |
| `provider-wallet` / `wallet`              | Зарегистрированный SDK и проверенный wallet token. | [Wallet](./plugins/wallet.md)             |
| `provider-bank-transfer` / `transfer`     | Показ QR/кода и polling.                           | [Перевод](./plugins/bank-transfer.md)     |

## Пакеты для разработки

| Пакет                       | Назначение                                                            |
| --------------------------- | --------------------------------------------------------------------- |
| `@checkout-kit/testing`     | Карты, fake providers/runners и MSW backend в отдельных entry points. |
| `@checkout-kit/conformance` | Vitest-контракт: повторы, replay и evidence другого заказа.           |

См. [тестирование](./testing.md). Мок-бэкенд не является сервером настоящих платежей.

## Установка и границы ответственности

[Быстрый старт](./getting-started.md#install-package-archives) устанавливает архивы и peers вместе. Комплект `0.2.0` (UI `0.2.0`; остальные пакеты `0.1.0`) распространяется через [GitHub Release](https://github.com/pavel-labs/checkout-kit/releases/tag/v0.2.0) с установщиком необходимых checkout-kit peers. Manifests настроены на GitHub Packages; публикация в реестр настраивается отдельно. Архивы сборки/CI также доступны.

Библиотека организует клиентский цикл. Сервер отвечает за покупателя, цену, credentials, постоянное состояние, атомарную идемпотентность, проверку уведомлений и выдачу заказа. См. [интеграцию сервера](./merchant-integration.md).
