---
{
  "layout": "home",
  "hero": {
    "name": "Checkout kit",
    "text": "Платёжный цикл под вашим контролем",
    "tagline": "Headless-движок, Stripe / Adyen / PayPal, браузерные и нативные хосты. Ваш интерфейс и API мерчанта.",
    "actions": [
      {
        "theme": "brand",
        "text": "Собрать чекаут",
        "link": "/ru/getting-started"
      },
      {
        "theme": "alt",
        "text": "Выбрать пакеты",
        "link": "/ru/packages"
      },
      {
        "theme": "alt",
        "text": "Попробовать демо",
        "link": "/demo/"
      }
    ]
  },
  "features": [
    {
      "title": "Три конкретных адаптера",
      "details": "PaymentIntents, Adyen Advanced flow и PayPal Orders с точными контрактами мерчанта и запускаемым HTTP-сервером.",
      "link": "/ru/packages#named-provider-adapters",
      "linkText": "Открыть руководство"
    },
    {
      "title": "Ваш платёжный интерфейс",
      "details": "React bindings и необязательный UI. Свои раскладки и SDK провайдеров для сбора инструмента.",
      "link": "/ru/react",
      "linkText": "Открыть руководство"
    },
    {
      "title": "Восстановление и повторы",
      "details": "Сохранение попытки при redirect/потере ответа и проверка прежней оплаты перед новым списанием.",
      "link": "/ru/runtime",
      "linkText": "Открыть руководство"
    },
    {
      "title": "Нативный хост",
      "details": "Typed WebView sessions, проверка сообщений, безопасные команды и возврат по deep link.",
      "link": "/ru/webview",
      "linkText": "Открыть руководство"
    },
    {
      "title": "Исполняемые контракты",
      "details": "Fixtures, браузерные сценарии, replay оплаты, чужое evidence и отдельная установка архивов.",
      "link": "/ru/testing",
      "linkText": "Открыть руководство"
    },
    {
      "title": "16 пакетов",
      "details": "Движок и адаптер; host/UI/test по необходимости, шесть референсных протоколов для своей интеграции.",
      "link": "/ru/packages",
      "linkText": "Открыть руководство"
    }
  ]
}
---

## Начните с работающего сценария

~~~sh
npm ci
npm run dev:integration
~~~

В [репозитории](https://github.com/pavel-labs/checkout-kit) это запускает React checkout и merchant server с локальными симуляторами без account keys. [Быстрый старт](./getting-started.md) ведёт к установке архивов и sandbox провайдера.

## Выберите путь

| Задача | Инструкция |
| --- | --- |
| Stripe / Adyen / PayPal | [Stripe](./providers/stripe.md), [Adyen](./providers/adyen.md), [PayPal](./providers/paypal.md). |
| Свой React-интерфейс | [React](./react.md), [UI](./ui.md), [runtime](./runtime.md). |
| Другой PSP или банк | [Референсы](./plugins/index.md), [контракт](./plugin-authoring.md), [тестирование](./testing.md). |
| Нативное приложение | [WebView](./webview.md) и пример хоста. |

## Один цикл, явные границы

Engine создаёт intent, подтверждает инструмент, выполняет actions и проверяет результат. Провайдер отвечает за протокол, runner за поверхность, мерчант за цену, покупателя и состояние оплаты.

Все 16 пакетов имеют ESM-архивы, декларации, API и тесты. Общие референсы не являются сертификацией банков. Account sandbox и registry publishing — отдельные шаги. [Сервер](./merchant-integration.md) описывает обязанности, [решение проблем](./troubleshooting.md) помогает при сбое.
