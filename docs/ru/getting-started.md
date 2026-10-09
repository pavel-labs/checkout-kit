# Быстрый старт

> [English](../getting-started.md)

Запустите полный сценарий, затем подключите тот же клиент к API мерчанта. Движок управляет попытками, действиями и восстановлением; SDK собирает инструмент, а сервер проверяет оплату.

## Полный локальный сценарий

Нужны Node.js 24 и npm:

```sh
git clone https://github.com/pavel-labs/checkout-kit.git
cd checkout-kit
npm ci
npm run dev:integration
```

Откройте `http://localhost:5173`. Команда запускает React и HTTP-сервер мерчанта в явном режиме **локального симулятора**, без ключей аккаунтов. Выберите Stripe, Adyen или PayPal. Цена определяется сервером по `planId`.

| Сценарий             | Mock-инструмент Stripe / Adyen | PayPal                                         |
| -------------------- | ------------------------------ | ---------------------------------------------- |
| Оплачено             | `pm_mock_approve`              | Подтвердите на локальной странице.             |
| Отказ                | `pm_mock_decline`              | Выберите отказ на локальной странице.          |
| Challenge / redirect | `pm_mock_challenge`            | Подтверждение уводит со страницы и возвращает. |
| Обработка            | `pm_mock_processing`           | Pending capture проверяется fixtures.          |

Обновите страницу возврата для проверки восстановления. Callback передаёт evidence; результат определяет API мерчанта. Mock-идентификаторы используются только в этом режиме.

[Демо сайта](/demo/) проверяет шесть референсных протоколов через MSW в браузере. Локальный пример выше проверяет три конкретных адаптера через HTTP-сервер. См. [тестирование](./testing.md).

## Установка архивов {#install-package-archives}

Скачайте `checkout-kit-0.1.0.tar.gz` из [GitHub Release](https://github.com/pavel-labs/checkout-kit/releases/tag/v0.1.0) и распакуйте его. В комплекте все 16 пакетов, manifest с хешами, checksums и отдельный установщик. Клонировать репозиторий или получать токен реестра не нужно.

Запускайте установщик **из каталога своего приложения**:

```sh
node /path/to/checkout-kit-0.1.0/install.mjs runtime-browser provider-paypal react ui
```

Он проверяет выбранные архивы и автоматически добавляет необходимые checkout-kit peers, включая core. Внешние peers, например React 19, устанавливает npm. Версия `react-dom` приложения должна быть совместима с React. Для другого адаптера замените `provider-paypal` на `provider-stripe` или `provider-adyen`.

```sh
# Список пакетов или проверка выбора без установки:
node /path/to/checkout-kit-0.1.0/install.mjs --list
node /path/to/checkout-kit-0.1.0/install.mjs provider-paypal react ui --dry-run
```

Без React выберите `runtime-browser` и провайдера. Отдельные `.tgz` assets можно установить через `npm install`, указав их checkout-kit peers в той же команде.

Архивы текущей разработки можно собрать из клона:

```sh
npm run pack:packages
# Из каталога своего приложения:
node /path/to/checkout-kit/artifacts/packages/install.mjs runtime-browser provider-paypal react ui
```

Успешный [CI](https://github.com/pavel-labs/checkout-kit/actions/workflows/ci.yml) также предоставляет development artifact `checkout-kit-packages`. Архивы помеченного релиза доступны после окончания срока хранения CI artifacts. Публикация в реестр настраивается отдельно.

Пакеты — ESM с декларациями. [Каталог](./packages.md) описывает все 16. [Releasing](../../RELEASING.md) описывает версии, архивы релизов и настройку реестра.

## Подключение приложения {#connect-your-app}

Скопируйте два проверяемых модуля из [React-гайда](./react.md#complete-example), затем восстановите попытку в браузерном корне:

```tsx
import { createRoot } from 'react-dom/client'
import { createPayPalCheckout } from './quickstart-engine'
import { PayPalCheckout } from './quickstart'

const { engine, runtime, pay } = createPayPalCheckout('http://localhost:4000', '/payment/return')
await engine.hydrate(runtime.readReturnParams())
const root = document.getElementById('root')
if (!root) throw new Error('Missing checkout root')
createRoot(root).render(<PayPalCheckout engine={engine} planId="1id" pay={pay} />)
```

Создавайте один движок на чекаут. На маршруте возврата сервер должен отдавать то же приложение. `baseUrl` указывает на аутентифицированный API мерчанта.

| Провайдер | Инструмент                                                   | Настройка                       |
| --------- | ------------------------------------------------------------ | ------------------------------- |
| Stripe    | PaymentMethod id из Stripe.js как `token`.                   | [Stripe](./providers/stripe.md) |
| Adyen     | Component `state.data` как `wallet` Adyen либо stored token. | [Adyen](./providers/adyen.md)   |
| PayPal    | `{ kind: 'none' }`; подтверждение на странице провайдера.    | [PayPal](./providers/paypal.md) |

## Официальные sandbox API

```sh
cp examples/server/.env.example examples/server/.env
cp examples/react/.env.example examples/react/.env
# Заполните test keys выбранного провайдера до запуска.
npm run dev:server -w @checkout-kit/examples
# Во втором терминале:
npm run dev:react -w @checkout-kit/examples
```

Используйте одинаковый hostname для app и API. Браузер хранит публичные ключи, сервер — секреты. Без ключей провайдер отключён. [Интеграция сервера](./merchant-integration.md) описывает настройки, маршруты, сессии и постоянное состояние.

## Продолжение интеграции

- [React](./react.md): время жизни движка, hooks, действия.
- [Runtime](./runtime.md): возврат, повторы, polling, отмена.
- [Тестирование](./testing.md): fixtures, браузерные сценарии, отдельная установка.
- [Решение проблем](./troubleshooting.md): причины и исправления.

`npm run verify:consumer` собирает и устанавливает архивы в отдельный проект, проверяет exports, строгие типы, Node checkout и React SSR. Симуляторы проверяют код; sandbox аккаунта — его SDK, уведомления и возврат.
