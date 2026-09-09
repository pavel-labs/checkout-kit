# Настройка окружения

> English version: [plugins/setup.md](../../plugins/setup.md)

Что установить, что импортировать, что положить в `.env` и что должен знать ваш сборщик. Всё на
этой странице одинаково для любого плагина; страницы плагинов добавляют только свой объект
конфига.

## Что установить

Пакеты разделены, чтобы вы везли только то, чем пользуетесь. Рантайм-зависимостей нет ни у
одного.

**React-чекаут — обычный случай:**

```bash
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/react @checkout-kit/ui
npm install @checkout-kit/provider-psp    # и по пакету на каждого провайдера
```

**Без React** — движком управляете вы, разметку рисуете свою:

```bash
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/provider-psp
```

**Нативное приложение**, которое держит чекаут в WebView, добавляет:

```bash
npm install @checkout-kit/webview-bridge
```

**Свой плагин** — добавьте тестовый материал и контракт, который надо пройти:

```bash
npm install --save-dev @checkout-kit/testing @checkout-kit/conformance msw vitest
```

### Зачем каждый пакет

| Пакет                           | Нужен, когда                               |
| ------------------------------- | ------------------------------------------ |
| `@checkout-kit/core`            | всегда — движок, домен, контракт плагина   |
| `@checkout-kit/runtime-browser` | в браузере — фреймы, редиректы и хранилище |
| `@checkout-kit/react`           | вы на React                                |
| `@checkout-kit/ui`              | нужны компоненты, а не свои собственные    |
| `@checkout-kit/provider-*`      | по одному на каждого провайдера            |
| `@checkout-kit/webview-bridge`  | чекаут живёт внутри нативного приложения   |
| `@checkout-kit/testing`         | нужен мок-бэкенд или тестовые карты        |
| `@checkout-kit/conformance`     | вы пишете плагин                           |

### Peer-зависимости

Каждый пакет объявляет peer на `@checkout-kit/core`, чтобы он не задвоился: две копии — это два
экземпляра каждого класса и `instanceof`, который начинает врать. У `react` и `ui` есть ещё peer
на **React 19**. У `@checkout-kit/react` дополнительно peer на `runtime-browser`.

`msw` — опциональный peer у `@checkout-kit/testing`: тестовые карты импортируются и без него,
он нужен только мок-бэкенду.

## Импорт стайлшита

Один импорт, один раз, там же, где точка входа вашего CSS:

```ts
import '@checkout-kit/ui/styles.css'
```

Дальше повесьте `ck-root` на обёртку — или используйте `<CheckoutRoot>`, который заодно несёт
тему и платформу:

```tsx
import { CheckoutRoot } from '@checkout-kit/react'

;<CheckoutRoot theme="auto">…</CheckoutRoot>
```

**С Tailwind** важен порядок. Кит живёт в каскадном слое `checkout`, поэтому импортируйте части
Tailwind явно и поставьте кит после preflight — иначе тот сбросит кнопки, которые кит рисует, —
и до utilities:

```css
@layer theme, base, components, checkout, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import '@checkout-kit/ui/styles.css';
@import 'tailwindcss/utilities.css' layer(utilities);
```

## Переменные окружения

Сам кит не читает никаких переменных окружения — в нём нет ни `process.env`, ни
`import.meta.env` вообще, и это проверяет `npm run purity`. **Между окружениями меняется конфиг,
который передаёте вы**, поэтому имена переменных ваши. Вот те, что реально отличаются.

### В браузере

| Что                    | Почему меняется между окружениями                     |
| ---------------------- | ----------------------------------------------------- |
| Базовый URL вашего API | `/api` в проде, туннель или порт в разработке         |
| Origin банка           | ACS песочницы провайдера в разработке, боевой в проде |

В Vite-приложении это две переменные. Обратите внимание на префикс `VITE_` — то, что без него,
в браузер не попадает, и для всего остального это ровно то поведение, которое нужно:

```bash
# .env.development
VITE_PAYMENT_API_BASE_URL=https://localhost:4000/api
VITE_ACS_ORIGIN=https://localhost:5100
```

```ts
const psp: PspConfig = {
  baseUrl: import.meta.env.VITE_PAYMENT_API_BASE_URL ?? '/api',
  acsOrigin: import.meta.env.VITE_ACS_ORIGIN,
}
```

::: danger Никогда — секретный ключ
Всё с префиксом `VITE_` компилируется в бандл и публично. Секретный ключ провайдера, пароль от
банка, API-токен — ничего из этого не попадает в браузер ни за какие деньги. Они живут на вашем
сервере, и именно поэтому `baseUrl` указывает на ваш бэкенд, а не на провайдера.
:::

### На вашем сервере

Это настоящие секреты, и им место только в окружении сервера:

```bash
# .env — никогда не коммитится
STRIPE_SECRET_KEY=sk_test_...
ADYEN_API_KEY=AQE...
ADYEN_MERCHANT_ACCOUNT=YourMerchantAccountTEST
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

# где живёт браузер — для CORS и для возвратного URL
CHECKOUT_ORIGIN=http://localhost:5173
CHECKOUT_RETURN_URL=http://localhost:5173/payment/return
```

Рабочий пример сервера, который читает ровно это, — [`examples/server`](../../../examples/server),
шаблон — [`examples/server/.env.example`](../../../examples/server/.env.example).

**Добавьте `.env` в `.gitignore` до того, как его напишете.** Коммитить `.env.example` с пустыми
значениями — нормальная практика; коммитить настоящий — это как утекают ключи.

### Для локальной разработки против мока

Демо в этом репозитории использует ещё одну, чтобы включить мок-бэкенд в браузере:

```bash
# apps/demo/.env.mock
VITE_ENABLE_MSW=true
VITE_ACS_ORIGIN=https://localhost:5100
```

## Возвратные URL

Любому провайдеру, который забирает вкладку целиком — [платёжная страница банка](./hosted-page.md),
PayPal, — нужно куда возвращаться:

```ts
const runtime = createBrowserRuntime({ returnPath: '/payment/return' })
```

Три вещи про этот путь:

1. **Это должен быть настоящий роут вашего приложения**, и на нём должен вызываться
   `engine.hydrate()`.
2. **Стройте его от базового пути**, если приложение отдаётся с подпути. Захардкоженный
   `/payment/return` — та самая ошибка, которая работает локально и ломается в проде:
   ```ts
   returnPath: `${import.meta.env.BASE_URL}payment/return`
   ```
3. **Провайдеру, скорее всего, надо про него сказать.** У большинства есть список разрешённых
   возвратных URL; добавьте туда все окружения.

## Сборщик и TypeScript

Обычно делать нечего. Пакеты ESM-only с обычной картой `exports`, современный сборщик разрешает
их без помощи.

Две вещи, о которых стоит знать:

- **Только ESM, намеренно.** Двойная сборка CJS/ESM везёт две копии каждого модуля, и тогда
  `instanceof` начинает врать. Если ваш тулчейн не умеет ESM, этот кит не для него.
- **Импорт только типа всё равно регистрирует id плагина.** `import type { PspConfig }`
  стирается при сборке, но несёт `declare module`, благодаря которому
  `defineProvider({ id: 'psp' })` проверяется типами. Поэтому тип конфига импортируется даже
  тогда, когда сам плагин приезжает только динамическим `import()`.

## Серверный рендеринг

В `@checkout-kit/core` нет DOM, а `@checkout-kit/react` читает движок через
`useSyncExternalStore` с серверным снапшотом — поэтому компонент, показывающий фазу или сумму,
на сервере рендерится нормально.

Две вещи работают только в браузере и честно об этом говорят:

- **`createBrowserRuntime()`** читает `window.location`. Создавайте движок в файле, который
  импортирует только клиент, или внутри эффекта.
- **`<PaymentActionHost/>`** делает свою работу в эффекте, поэтому на сервере рисует пустой
  `<div>` и ничего не запускает.

## Браузеры

Нижняя граница — **Safari 16**, её задают container-запросы: все решения о раскладке в UI-ките
сделаны на них, потому что один и тот же чекаут рисуется на всю страницу, в 360px WebView и
внутри iframe мерчанта неизвестной ширины.

Движку нужен `crypto.randomUUID` (Safari 15.4) для id по умолчанию; передайте свой `uuid` в
`createCheckout`, если нужно ниже. `AbortSignal.any` используется только там, где он есть.

## Как проверить, что всё работает, до получения доступов

Чтобы запустить все шесть плагинов, аккаунт ни у кого не нужен:

```bash
npm run dev:mock   # чекаут с мок-бэкендом в браузере
npm run dev:bank   # симулятор 3-D Secure, на своём https-origin
```

Мок-бэкенд — это `@checkout-kit/testing`, настоящий пакет, на который можно направить и своё
приложение; см. [его справочник](../../../packages/testing/README.ru.md). Симулятор банка отдаёт
https с самоподписанным сертификатом, поэтому один раз откройте `https://localhost:5100/` и
примите его.
