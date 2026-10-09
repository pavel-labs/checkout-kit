# Выбор референсного протокола

> [English](../../plugins/index.md)

Шесть пакетов реализуют общие протоколы API мерчанта с мок-бэкендом. Они помогают создать свой адаптер, изучить action flow и проверить чекаут без credentials. Для [Stripe](../providers/stripe.md), [Adyen](../providers/adyen.md), [PayPal](../providers/paypal.md) есть отдельные конкретные адаптеры.

## Подберите контракт

| Пакет                    | Контракт                                 |
| ------------------------ | ---------------------------------------- |
| `provider-psp`           | [JSON PSP](./psp.md)                     |
| `provider-acquiring`     | [Form-эквайер](./acquiring.md)           |
| `provider-hpp`           | [Платёжная страница](./hosted-page.md)   |
| `provider-hosted-fields` | [Хостед-поля](./hosted-fields.md)        |
| `provider-wallet`        | [SDK кошелька](./wallet.md)              |
| `provider-bank-transfer` | [Банковский перевод](./bank-transfer.md) |

PSP/эквайер принимают карту; hosted/wallet/transfer собирают данные или подтверждение через действия. Похожий поток не означает готовое подключение конкретного банка/кошелька. [Каталог](../packages.md) перечисляет все пакеты.

## Настройка

Импортируйте config type, зарегистрируйте реальный id с динамическим import, передайте engine browser runners/storage. [Точка сборки демо](../../../apps/demo/src/app/providers/checkout.ts) содержит все шесть и wallet adapter.

Общий цикл: create → confirm → action/evidence → resume → outcome. Инструменты, endpoints и actions различаются. Callback — связанные данные; оплату устанавливает merchant state. Цена, ownership и credentials принадлежат серверу; операции атомарны и идемпотентны. Raw-card формы — референсы симулятора; реальный инструмент собирает интеграция выбранного провайдера.

[Окружение](./setup.md) · [Свой провайдер](../plugin-authoring.md) · [Тестирование](../testing.md)
