# Быстрый старт

> [English](../getting-started.md)

Запустите полный сценарий, затем подключите тот же клиент к API мерчанта. Движок управляет попытками, действиями и восстановлением; SDK собирает инструмент, а сервер проверяет оплату.

## Полный локальный сценарий

Нужны Node.js 24 и npm:

~~~sh
git clone https://github.com/pavel-labs/checkout-kit.git
cd checkout-kit
npm ci
npm run dev:integration
~~~

Откройте `http://localhost:5173`. Команда запускает React и HTTP-сервер мерчанта в явном режиме **локального симулятора**, без ключей аккаунтов. Выберите Stripe, Adyen или PayPal. Цена определяется сервером по `planId`.

| Сценарий | Mock-инструмент Stripe / Adyen | PayPal |
| --- | --- | --- |
| Оплачено | `pm_mock_approve` | Подтвердите на локальной странице. |
| Отказ | `pm_mock_decline` | Выберите отказ на локальной странице. |
| Challenge / redirect | `pm_mock_challenge` | Подтверждение уводит со страницы и возвращает. |
| Обработка | `pm_mock_processing` | Pending capture проверяется fixtures. |

Обновите страницу возврата для проверки восстановления. Callback передаёт evidence; результат определяет API мерчанта. Mock-идентификаторы используются только в этом режиме.

[Демо сайта](/demo/) проверяет шесть референсных протоколов через MSW в браузере. Локальный пример выше проверяет три конкретных адаптера через HTTP-сервер. См. [тестирование](./testing.md).

## Установка архивов {#install-package-archives}

До публикации версии в реестр соберите архивы либо скачайте `checkout-kit-packages` успешного [CI](https://github.com/pavel-labs/checkout-kit/actions/workflows/ci.yml):

~~~sh
npm run pack:packages
~~~

Архивы и integrity manifest появятся в `artifacts/packages`. В React-приложении установите выбранные пакеты и peers вместе, заменив путь/версию:

~~~sh
npm install \
  ../checkout-kit/artifacts/packages/checkout-kit-core-0.0.0.tgz \
  ../checkout-kit/artifacts/packages/checkout-kit-runtime-browser-0.0.0.tgz \
  ../checkout-kit/artifacts/packages/checkout-kit-provider-paypal-0.0.0.tgz \
  ../checkout-kit/artifacts/packages/checkout-kit-react-0.0.0.tgz \
  ../checkout-kit/artifacts/packages/checkout-kit-ui-0.0.0.tgz \
  react@^19 react-dom@^19
~~~


Пакеты — ESM с декларациями. [Каталог](./packages.md) описывает все 16. Без React нужны core, runtime и провайдер. [Releasing](../../RELEASING.md) описывает реестр и версии.

## Подключение приложения {#connect-your-app}

Скопируйте два проверяемых модуля из [React-гайда](./react.md#complete-example), затем восстановите попытку в браузерном корне:

~~~tsx
import { createRoot } from 'react-dom/client'
import { createPayPalCheckout } from './quickstart-engine'
import { PayPalCheckout } from './quickstart'

const { engine, runtime, pay } = createPayPalCheckout('http://localhost:4000', '/payment/return')
await engine.hydrate(runtime.readReturnParams())
const root = document.getElementById('root')
if (!root) throw new Error('Missing checkout root')
createRoot(root).render(<PayPalCheckout engine={engine} planId="1id" pay={pay} />)
~~~


Создавайте один движок на чекаут. На маршруте возврата сервер должен отдавать то же приложение. `baseUrl` указывает на аутентифицированный API мерчанта.

| Провайдер | Инструмент | Настройка |
| --- | --- | --- |
| Stripe | PaymentMethod id из Stripe.js как `token`. | [Stripe](./providers/stripe.md) |
| Adyen | Component `state.data` как `wallet` Adyen либо stored token. | [Adyen](./providers/adyen.md) |
| PayPal | `{ kind: 'none' }`; подтверждение на странице провайдера. | [PayPal](./providers/paypal.md) |

## Официальные sandbox API

~~~sh
cp examples/server/.env.example examples/server/.env
cp examples/react/.env.example examples/react/.env
# Заполните test keys выбранного провайдера до запуска.
npm run dev:server -w @checkout-kit/examples
# Во втором терминале:
npm run dev:react -w @checkout-kit/examples
~~~

Используйте одинаковый hostname для app и API. Браузер хранит публичные ключи, сервер — секреты. Без ключей провайдер отключён. [Интеграция сервера](./merchant-integration.md) описывает настройки, маршруты, сессии и постоянное состояние.

## Продолжение интеграции

- [React](./react.md): время жизни движка, hooks, действия.
- [Runtime](./runtime.md): возврат, повторы, polling, отмена.
- [Тестирование](./testing.md): fixtures, браузерные сценарии, отдельная установка.
- [Решение проблем](./troubleshooting.md): причины и исправления.

`npm run verify:consumer` собирает и устанавливает архивы в отдельный проект, проверяет exports, строгие типы, Node checkout и React SSR. Симуляторы проверяют код; sandbox аккаунта — его SDK, уведомления и возврат.
