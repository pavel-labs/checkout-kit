# Хостед-поля

> [English](../../plugins/hosted-fields.md)

`@checkout-kit/provider-hosted-fields` — исполняемый референсный протокол API мерчанта и симулятора. Сам по себе он не подключается к конкретному банку.

## Поток и граница

Provider-owned iframe, exact-origin postMessage и непустой непрозрачный card token. Credential/header относится к API мерчанта.

Цена, владелец и результат определяются сервером. Проверка адаптера до мутации сохраняет конечный результат; сервер обеспечивает переходы и идемпотентность атомарно. Cancel не переписывает paid, повтор confirm/resume не создаёт второе списание.

## Регистрация

```ts
import { defineProvider } from '@checkout-kit/core'
import type { HostedFieldsConfig } from '@checkout-kit/provider-hosted-fields'

const config: HostedFieldsConfig = {
  baseUrl: '/api',
  fieldsUrl: 'https://fields.example.com/card',
  fieldsOrigin: 'https://fields.example.com',
}

const provider = defineProvider({
  id: 'hostedfields',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-hosted-fields'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

Config type регистрирует id в TypeScript; динамический import загружает реализацию. Подключите runners, storage и return URL, как в [React](../react.md) или [runtime](../runtime.md). Для видимой поверхности нужен mount.

## Точный HTTP-контракт

Маршруты, fields и ключи ниже совпадают с [README пакета](../../../packages/provider-hosted-fields/README.md); protocol names сохранены в исходной форме:

| Method | Path                                | Contract                                               |
| ------ | ----------------------------------- | ------------------------------------------------------ |
| POST   | `/hosted-fields/charges`            | `{ planId }`; return a charge.                         |
| GET    | `/hosted-fields/charges/:id`        | Authoritative charge.                                  |
| POST   | `/hosted-fields/charges/:id/pay`    | `{ token }`; exchange the opaque token on your server. |
| POST   | `/hosted-fields/charges/:id/cancel` | Cancel an unfinished charge.                           |


Все шесть reference configs поддерживают credentials и headers API мерчанта. Повтор операции сохраняет прежний ключ. После reload сервер возвращает состояние и активное действие.

## Проверка

Запустите `npm run dev:mock` / `npm run dev:bank` либо [демо сайта](/demo/). Проверьте success, decline, action, processing, retry и чужое evidence. [Conformance](../testing.md) проверяет контракт без account credentials.

[Окружение](./setup.md) · [Восстановление](../runtime.md) · [Каталог](../packages.md)
