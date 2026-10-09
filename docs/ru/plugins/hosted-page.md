# Платёжная страница

> [English](../../plugins/hosted-page.md)

`@checkout-kit/provider-hpp` — исполняемый референсный протокол API мерчанта и симулятора. Сам по себе он не подключается к конкретному банку.

## Поток и граница

Hosted page, top/iframe redirect и проверка return URL по заказу. Query status не доказывает оплату; адаптер читает merchant order.

Цена, владелец и результат определяются сервером. Проверка адаптера до мутации сохраняет конечный результат; сервер обеспечивает переходы и идемпотентность атомарно. Cancel не переписывает paid, повтор confirm/resume не создаёт второе списание.

## Регистрация

```ts
import { defineProvider } from '@checkout-kit/core'
import type { HostedPageConfig } from '@checkout-kit/provider-hpp'

const config: HostedPageConfig = { baseUrl: '/api', pageUrl: 'https://bank.example.com/pay' }

const provider = defineProvider({
  id: 'hpp',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-hpp'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

Config type регистрирует id в TypeScript; динамический import загружает реализацию. Подключите runners, storage и return URL, как в [React](../react.md) или [runtime](../runtime.md). Для видимой поверхности нужен mount.

## Точный HTTP-контракт

Маршруты, fields и ключи ниже совпадают с [README пакета](../../../packages/provider-hpp/README.md); protocol names сохранены в исходной форме:

| Method | Path                 | Contract                                                  |
| ------ | -------------------- | --------------------------------------------------------- |
| POST   | `/hosted/orders`     | `{ planId }`; return `{ orderId }`.                       |
| GET    | `/hosted/orders/:id` | Authoritative order with id, amount, currency and status. |

Все шесть reference configs поддерживают credentials и headers API мерчанта. Повтор операции сохраняет прежний ключ. После reload сервер возвращает состояние и активное действие.

## Проверка

Запустите `npm run dev:mock` / `npm run dev:bank` либо [демо сайта](/demo/). Проверьте success, decline, action, processing, retry и чужое evidence. [Conformance](../testing.md) проверяет контракт без account credentials.

[Окружение](./setup.md) · [Восстановление](../runtime.md) · [Каталог](../packages.md)
