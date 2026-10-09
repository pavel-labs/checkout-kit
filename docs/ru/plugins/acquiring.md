# Form-эквайер

> [English](../../plugins/acquiring.md)

`@checkout-kit/provider-acquiring` — исполняемый референсный протокол API мерчанта и симулятора. Сам по себе он не подключается к конкретному банку.

## Поток и граница

Form API, numeric statuses, 3DS1 PaReq/PaRes. Браузер обращается к merchant proxy с demo credentials; реальные bank passwords остаются на сервере. USD/EUR/GBP поддержаны; status возвращает активные MD/acsUrl/paReq. Симулятор PaRes не является проверкой подписи настоящего банка.

Цена, владелец и результат определяются сервером. Проверка адаптера до мутации сохраняет конечный результат; сервер обеспечивает переходы и идемпотентность атомарно. Cancel не переписывает paid, повтор confirm/resume не создаёт второе списание.

## Регистрация

```ts
import { defineProvider } from '@checkout-kit/core'
import type { AcquiringConfig } from '@checkout-kit/provider-acquiring'

const config: AcquiringConfig = {
  baseUrl: '/acquiring',
  userName: 'demo-api',
  password: 'demo',
  acsOrigin: 'https://acs.example.com',
}

const provider = defineProvider({
  id: 'acquiring',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-acquiring'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

Config type регистрирует id в TypeScript; динамический import загружает реализацию. Подключите runners, storage и return URL, как в [React](../react.md) или [runtime](../runtime.md). Для видимой поверхности нужен mount.

## Точный HTTP-контракт

Маршруты, fields и ключи ниже совпадают с [README пакета](../../../packages/provider-acquiring/README.md); protocol names сохранены в исходной форме:

| Method | Path                              | Contract                                                                 |
| ------ | --------------------------------- | ------------------------------------------------------------------------ |
| POST   | `/rest/register.do`               | Form `{ planId, orderNumber, currency, amount }`; return `{ orderId }`.  |
| POST   | `/rest/getOrderStatusExtended.do` | Form `{ orderId }`; return verified numeric status and active challenge. |
| POST   | `/rest/paymentorder.do`           | Form `{ MDORDER, $PAN, $EXPIRY, $CVC }`; return result or challenge.     |
| POST   | `/rest/finish3ds.do`              | Form `{ MD, PaRes }`; finish authentication.                             |
| POST   | `/rest/reverse.do`                | Form `{ orderId }`; cancel an unfinished order.                          |

Все шесть reference configs поддерживают credentials и headers API мерчанта. Повтор операции сохраняет прежний ключ. После reload сервер возвращает состояние и активное действие.

## Проверка

Запустите `npm run dev:mock` / `npm run dev:bank` либо [демо сайта](/demo/). Проверьте success, decline, action, processing, retry и чужое evidence. [Conformance](../testing.md) проверяет контракт без account credentials.

[Окружение](./setup.md) · [Восстановление](../runtime.md) · [Каталог](../packages.md)
