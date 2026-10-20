# Быстрый старт

> [English](../getting-started.md)

Установите пакеты из npm, подключите приложение и проверьте его на симуляторе или своём тестовом аккаунте Stripe, Adyen или PayPal. Полный локальный пример можно запустить без ключей.

Кто за что отвечает: движок проводит шаги оплаты, повторы и восстановление. SDK провайдера принимает данные карты. Ваш сервер проверяет, прошла ли оплата на самом деле. Если встретилось непонятное слово, загляните в [словарь терминов](./glossary.md).

<span id="install-package-archives"></span>

## Установка из npm {#install-from-npm}

Все 16 пакетов доступны публично в [npm](https://www.npmjs.com/org/checkout-kit). Выполняйте команды в **папке своего приложения**. Клонировать checkout-kit, скачивать архивы, входить в npm или настраивать приватный реестр не нужно. Используйте полные имена `@checkout-kit/*`, а не имя `checkout-kit` без scope.

### Браузерная оплата без React

Для PayPal установите движок, браузерный runtime и провайдера:

```sh
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal
```

Те же пакеты можно установить через pnpm, Yarn или Bun:

```sh
pnpm add @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal
yarn add @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal
bun add @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal
```

Выберите **одну** команду для своего менеджера пакетов. Во всех пакетах есть ESM JavaScript и типы TypeScript; собирать библиотеку в приложении не нужно. Провайдеру всё равно нужны [маршруты на вашем сервере](./merchant-integration.md).

### React 19 и необязательный UI

Для полного [React-примера](./react.md#complete-example), включая PayPal и UI-кит:

```sh
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal @checkout-kit/react @checkout-kit/ui react@^19 react-dom@^19
```

Версии React и React DOM должны совпадать. Если в приложении уже есть совместимые версии React 19, оставьте их. Если используете свою дизайн-систему, уберите `@checkout-kit/ui`; для оплаты без React не добавляйте React-пакеты и их зависимости.

При использовании UI один раз импортируйте стили:

```ts
import '@checkout-kit/ui/styles.css'
```

### Stripe, Adyen или PayPal

Вместо команды PayPal выше выберите команду своего провайдера. React/UI при необходимости добавьте отдельно.

```sh
# Stripe: Stripe.js собирает PaymentMethod и выполняет шаги SDK.
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-stripe @stripe/stripe-js

# Adyen: браузерный SDK для зашифрованных полей и 3DS2.
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-adyen @adyen/adyen-web

# PayPal: подтверждение через перенаправление, браузерный SDK не нужен.
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-paypal
```

Если используете React Elements от Stripe, дополнительно установите `@stripe/react-stripe-js`. **Серверный** SDK провайдера настраивается отдельно; секретные ключи нельзя помещать в браузер. Подробнее: [Stripe](./providers/stripe.md), [Adyen](./providers/adyen.md), [PayPal](./providers/paypal.md).

### Мост для мобильного WebView

В **обоих** проектах — веб-оплате и нативном приложении:

```sh
npm install @checkout-kit/core @checkout-kit/webview-bridge
```

Нативный код импортирует `@checkout-kit/webview-bridge/host` и `/protocol`, веб-страница — корневой импорт. Компонент WebView установите в мобильном приложении отдельно (для Expo: `npx expo install react-native-webview`). См. [WebView](./webview.md).

### Тестирование и проверка контракта провайдера

Для тестовых данных и поддельных провайдеров нужны только core и testing:

```sh
npm install @checkout-kit/core
npm install --save-dev @checkout-kit/testing
```

Для `@checkout-kit/testing/backend` добавьте необязательную зависимость `msw@^2.15.0`. Для набора контрактных тестов установите все его зависимости:

```sh
npm install @checkout-kit/core
npm install --save-dev @checkout-kit/testing @checkout-kit/conformance msw@^2.15.0 vitest@^5.0.0
```

Оставьте core в рабочих зависимостях, а тестовые инструменты — в dev-зависимостях. Эти инструменты симулируют платежи; подробнее — [тестирование](./testing.md).

### Протоколы-примеры

Эти шесть опубликованных пакетов — **шаблоны с симулятором**, а не подключения к настоящим банкам. Выберите нужный:

```sh
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-psp
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-acquiring
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-hpp
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-hosted-fields
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-wallet
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-bank-transfer
```

В [каталоге](./packages.md) есть ссылки на все 16 пакетов в npm и описание их назначения. Импорты `@checkout-kit/core/engine`, `@checkout-kit/testing/backend` и `@checkout-kit/ui/styles.css` — **точки входа родительского пакета**, а не отдельные пакеты для установки.

### Архивы и сборка из исходников

Для фиксированного комплекта архивов GitHub следуйте [Releasing](../../RELEASING.md#install-a-tagged-release). Чтобы собрать текущий код в клоне репозитория:

```sh
npm ci
npm run pack:packages
# Из папки своего приложения:
node /path/to/checkout-kit/artifacts/packages/install.mjs runtime-browser provider-paypal react ui
```

CI тоже сохраняет эти архивы под именем `checkout-kit-packages`. Это альтернатива npm. Старый комплект GitHub `0.2.0` содержит UI `0.2.0` и остальные пакеты `0.1.0`; версия комплекта не равна версии каждого пакета в npm.

## Пример у себя на компьютере {#run-a-complete-local-flow}

Нужны Node.js 24 и npm:

```sh
git clone https://github.com/pavel-labs/checkout-kit.git
cd checkout-kit
npm ci
npm run dev:integration
```

Откройте `http://localhost:5173`. Команда запускает страницу на React и тестовый сервер. Вместо настоящих провайдеров отвечает **локальный симулятор**, поэтому ключи не нужны. Выберите Stripe, Adyen или PayPal. Цену назначает сервер по `planId`, а не браузер.

Попробуйте разные исходы:

| Что проверить                          | Stripe / Adyen: введите значение | PayPal                                                        |
| -------------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| Успешная оплата                        | `pm_mock_approve`                | Подтвердите на тестовой странице.                             |
| Отказ                                  | `pm_mock_decline`                | Откажитесь на тестовой странице.                              |
| Доп. проверка банком / перенаправление | `pm_mock_challenge`              | Подтверждение открывает другую страницу и возвращает обратно. |
| Платёж ещё в обработке                 | `pm_mock_processing`             | Проверяется только автотестами.                               |

Чтобы увидеть восстановление, обновите страницу, когда находитесь на странице возврата. Данные, вернувшиеся в адресе, говорят лишь о том, что покупатель прошёл шаг. Настоящий результат всё равно приходит с сервера. Значения `pm_mock_*` работают только с симулятором.

Есть два демо:

- [демо на сайте](/demo/) показывает шесть протоколов-примеров. Его поддельный сервер работает прямо в браузере (MSW);
- локальный пример выше показывает три настоящих адаптера (Stripe, Adyen, PayPal) с настоящим HTTP-сервером.

Оба описаны в разделе [тестирование](./testing.md).

## Подключение приложения {#connect-your-app}

Скопируйте два файла из [руководства по React](./react.md#complete-example). Затем в файле, с которого стартует приложение, восстановите незаконченную оплату и отрисуйте экран:

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

Правила:

- на одну оплату создавайте **один** движок;
- страница возврата (`/payment/return`) должна открывать то же приложение;
- `baseUrl` — адрес API вашего сервера, и пользователь там должен быть авторизован.

Что каждый провайдер ждёт в качестве платёжного инструмента:

| Провайдер | Что передать                                                               | Настройка                       |
| --------- | -------------------------------------------------------------------------- | ------------------------------- |
| Stripe    | id PaymentMethod из Stripe.js как `token`.                                 | [Stripe](./providers/stripe.md) |
| Adyen     | `state.data` из компонента Adyen как `wallet` или токен сохранённой карты. | [Adyen](./providers/adyen.md)   |
| PayPal    | `{ kind: 'none' }`. Покупатель подтверждает оплату на странице PayPal.     | [PayPal](./providers/paypal.md) |

## Подключение настоящего тестового аккаунта {#use-official-sandbox-apis}

```sh
cp examples/server/.env.example examples/server/.env
cp examples/react/.env.example examples/react/.env
# Перед запуском заполните тестовые ключи выбранного провайдера.
npm run dev:server -w @checkout-kit/examples
# Во втором терминале:
npm run dev:react -w @checkout-kit/examples
```

- Открывайте приложение и API на **одном и том же имени хоста** (например, оба на `localhost`). Иначе не будет работать cookie входа.
- Ключи в `.env` браузера — публичные. Ключи в `.env` сервера — секретные, их никогда нельзя отдавать в браузер.
- Если у провайдера нет ключей, он просто отключается.

В разделе [сервер мерчанта](./merchant-integration.md) перечислены все настройки, маршруты, вход пользователя и то, что нужно хранить в базе данных.

## Что читать дальше {#continue-your-integration}

- [React](./react.md): сколько живёт движок, хуки, дополнительные шаги.
- [Работа в браузере и восстановление](./runtime.md): перенаправления, повторы, проверка статуса, отмена.
- [Тестирование](./testing.md): тестовые данные, сценарии в браузере, проверка установки в чистом проекте.
- [Решение проблем](./troubleshooting.md): частые проблемы и как их исправить.

`npm run verify:consumer` собирает пакеты, ставит их в новый пустой проект и проверяет экспорты, строгие типы, проведение оплаты в Node и серверный рендеринг React. Тесты и симулятор проверяют код. А SDK провайдера, уведомления и настройки возврата можно проверить только на своём тестовом аккаунте.

## Версии пакетов и обновление {#public-npm-release-preparation}

Пакеты опубликованы под тегом `latest`: обычная команда установки использует его. Версии независимы: `core`, `runtime-browser` и `provider-adyen` — `0.2.0`, UI — `0.2.1`, остальные — `0.1.1`. Проверить пакет можно командой `npm view @checkout-kit/core version` или по ссылке в [каталоге](./packages.md).

Сохраняйте lockfile приложения в git. Чтобы перейти с архивов (`file:...tgz`) на npm, повторите нужную команду установки выше с полными именами пакетов и проверьте изменения в `package.json` и lockfile. При обновлении старых версий читайте changelog пакетов и [инструкцию миграции](./production.md#a-safe-browser-configuration). [Releasing](../../RELEASING.md#public-npm-publication) предназначен для мейнтейнеров, публикующих следующие версии.
