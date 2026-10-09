# JSON PSP

> [English](../../plugins/psp.md)

`@checkout-kit/provider-psp` — исполняемый референсный протокол API мерчанта и симулятора. Сам по себе он не подключается к конкретному банку.

## Поток и граница

JSON API, saved tokens и 3DS2 challenge. Evidence содержит текущий challengeId, transStatus и точный ACS origin.

Цена, владелец и результат определяются сервером. Проверка адаптера до мутации сохраняет конечный результат; сервер обеспечивает переходы и идемпотентность атомарно. Cancel не переписывает paid, повтор confirm/resume не создаёт второе списание.

## Регистрация

```ts
import { defineProvider } from '@checkout-kit/core'
import type { PspConfig } from '@checkout-kit/provider-psp'

const config: PspConfig = { baseUrl: '/api', acsOrigin: 'https://acs.example.com' }

const provider = defineProvider({
  id: 'psp',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-psp'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

Config type регистрирует id в TypeScript; динамический import загружает реализацию. Подключите runners, storage и return URL, как в [React](../react.md) или [runtime](../runtime.md). Для видимой поверхности нужен mount.

## Точный HTTP-контракт

Маршруты, fields и ключи ниже совпадают с [README пакета](../../../packages/provider-psp/README.md); protocol names сохранены в исходной форме:

| Method | Path                           | Contract                                                      |
| ------ | ------------------------------ | ------------------------------------------------------------- |
| POST   | `/payment-intents`             | Create from `{ planId }`; return an intent.                   |
| GET    | `/payment-intents/:id`         | Authoritative intent, including its active challenge.         |
| POST   | `/payment-intents/:id/confirm` | `{ cardNumber }` or `{ paymentMethodId }`; return the intent. |
| POST   | `/3ds/challenge/:id/complete`  | Mock `{ outcome }`; return `{ paymentIntent }`.               |
| POST   | `/payment-intents/:id/cancel`  | Cancel an unfinished intent.                                  |


Все шесть reference configs поддерживают credentials и headers API мерчанта. Повтор операции сохраняет прежний ключ. После reload сервер возвращает состояние и активное действие.

## Проверка

Запустите `npm run dev:mock` / `npm run dev:bank` либо [демо сайта](/demo/). Проверьте success, decline, action, processing, retry и чужое evidence. [Conformance](../testing.md) проверяет контракт без account credentials.

[Окружение](./setup.md) · [Восстановление](../runtime.md) · [Каталог](../packages.md)
