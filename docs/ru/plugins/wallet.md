# SDK кошелька

> [English](../../plugins/wallet.md)

`@checkout-kit/provider-wallet` — исполняемый референсный протокол API мерчанта и симулятора. Сам по себе он не подключается к конкретному банку.

## Поток и граница

SDK handoff с adapter, чей sdk id совпадает с action. Callback возвращает непустой строковый walletToken. Apple Pay, Google Pay и PayPal SDK не включены.

Цена, владелец и результат определяются сервером. Проверка адаптера до мутации сохраняет конечный результат; сервер обеспечивает переходы и идемпотентность атомарно. Cancel не переписывает paid, повтор confirm/resume не создаёт второе списание.

## Регистрация

```ts
import { defineProvider } from '@checkout-kit/core'
import type { WalletConfig } from '@checkout-kit/provider-wallet'

const config: WalletConfig = {
  baseUrl: '/api',
  sdk: 'merchant-wallet',
  scriptUrl: 'https://wallet.example.com/sdk.js',
  merchantName: 'Shop',
}

const provider = defineProvider({
  id: 'wallet',
  config: { ...config, credentials: 'include' },
  load: () => import('@checkout-kit/provider-wallet'),
})
// Pass provider to createCheckout({ providers: [provider], ... }).
```

Config type регистрирует id в TypeScript; динамический import загружает реализацию. Подключите runners, storage и return URL, как в [React](../react.md) или [runtime](../runtime.md). Для видимой поверхности нужен mount.

## Точный HTTP-контракт

Маршруты, fields и ключи ниже совпадают с [README пакета](../../../packages/provider-wallet/README.md); protocol names сохранены в исходной форме:

| Method | Path                         | Contract                                             |
| ------ | ---------------------------- | ---------------------------------------------------- |
| POST   | `/wallet/charges`            | `{ planId }`; return a charge.                       |
| GET    | `/wallet/charges/:id`        | Authoritative charge.                                |
| POST   | `/wallet/charges/:id/pay`    | `{ walletToken }`; verify and charge on your server. |
| POST   | `/wallet/charges/:id/cancel` | Cancel an unfinished charge.                         |

Все шесть reference configs поддерживают credentials и headers API мерчанта. Повтор операции сохраняет прежний ключ. После reload сервер возвращает состояние и активное действие.

## Проверка

Запустите `npm run dev:mock` / `npm run dev:bank` либо [демо сайта](/demo/). Проверьте success, decline, action, processing, retry и чужое evidence. [Conformance](../testing.md) проверяет контракт без account credentials.

[Окружение](./setup.md) · [Восстановление](../runtime.md) · [Каталог](../packages.md)
