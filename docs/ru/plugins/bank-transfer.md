# Банковский перевод

> [English](../../plugins/bank-transfer.md)

`@checkout-kit/provider-bank-transfer` — исполняемый референсный протокол API мерчанта и симулятора. Сам по себе он не подключается к конкретному банку.

## Поток и граница

Показ code/QR; результат приходит polling заказа. Копирование/сканирование не подтверждает оплату.

Цена, владелец и результат определяются сервером. Проверка адаптера до мутации сохраняет конечный результат; сервер обеспечивает переходы и идемпотентность атомарно. Cancel не переписывает paid, повтор confirm/resume не создаёт второе списание.

## Регистрация

```ts
import { defineProvider } from '@checkout-kit/core'
import type { BankTransferConfig } from '@checkout-kit/provider-bank-transfer'

const config: BankTransferConfig = {
  baseUrl: '/api',
  format: 'qr',
  instructions: 'Pay in your banking app.',
}

const provider = defineProvider({
  id: 'transfer',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-bank-transfer'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

Config type регистрирует id в TypeScript; динамический import загружает реализацию. Подключите runners, storage и return URL, как в [React](../react.md) или [runtime](../runtime.md). Для видимой поверхности нужен mount.

## Точный HTTP-контракт

Маршруты, fields и ключи ниже совпадают с [README пакета](../../../packages/provider-bank-transfer/README.md); protocol names сохранены в исходной форме:

| Method | Path                          | Contract                                                         |
| ------ | ----------------------------- | ---------------------------------------------------------------- |
| POST   | `/transfer/orders`            | `{ planId }`; return an order.                                   |
| GET    | `/transfer/orders/:id`        | Authoritative order.                                             |
| POST   | `/transfer/orders/:id/code`   | Return `{ order, payload, qrImageUrl?, deeplink?, expiresAt? }`. |
| POST   | `/transfer/orders/:id/cancel` | Cancel an unfinished order.                                      |

Все шесть reference configs поддерживают credentials и headers API мерчанта. Повтор операции сохраняет прежний ключ. После reload сервер возвращает состояние и активное действие.

## Проверка

Запустите `npm run dev:mock` / `npm run dev:bank` либо [демо сайта](/demo/). Проверьте success, decline, action, processing, retry и чужое evidence. [Conformance](../testing.md) проверяет контракт без account credentials.

[Окружение](./setup.md) · [Восстановление](../runtime.md) · [Каталог](../packages.md)
