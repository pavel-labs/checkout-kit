# WebView и мобильные приложения

> [English](../webview.md)

Мобильное приложение может показать веб-страницу оплаты внутри WebView (встроенного браузера). `@checkout-kit/webview-bridge` позволяет странице и приложению безопасно общаться: страница сообщает, что происходит с оплатой, а приложение может отправлять команды, например «отменить».

У пакета три точки входа. Нативная часть импортирует `/host` или `/protocol`. Они работают без браузера и без зависимости от React Native.

## Установка из npm

```sh
npm install @checkout-kit/core @checkout-kit/webview-bridge
```

[Пакет в npm](https://www.npmjs.com/package/@checkout-kit/webview-bridge) · [Все варианты установки](./getting-started.md#install-from-npm)

Установите пакеты в веб-проекте и нативном хосте. Компонент WebView установите в мобильном приложении отдельно; для Expo используйте `npx expo install react-native-webview`.

| Импорт                                  | Где работает                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| `@checkout-kit/webview-bridge`          | На веб-странице: `createWebViewBridge(engine, options)`.                                |
| `@checkout-kit/webview-bridge/host`     | В приложении: обработка сообщений, отправка команд, правила навигации, ссылки возврата. |
| `@checkout-kit/webview-bridge/protocol` | Где угодно: типы, версия протокола и строгие разборщики сообщений.                      |

## На веб-странице {#web-page}

```ts
import { createWebViewBridge } from '@checkout-kit/webview-bridge'
const bridge = createWebViewBridge(engine, { reportHeight: true })
// Register once for this document, and call bridge.stop() when disposing the checkout.
```

- Мост сам находит `window.ReactNativeWebView`. В обычном браузере он ничего не делает.
- Он отправляет `PAYMENT_READY`, события состояния и шагов, а также проверенные результаты.
- Данные в каждом сообщении отбираются поле за полем. Данных карты там никогда нет.
- `onError` может сообщить, что сообщение не удалось доставить в приложение. На оплату это не влияет.

## В приложении {#native-host}

```ts
import {
  createBridgeCommand,
  createCheckoutMessageHandler,
  createCommandScript,
} from '@checkout-kit/webview-bridge/host'

const handle = createCheckoutMessageHandler({
  PAYMENT_SUCCEEDED: (event) => showReceipt(event.payload.intentId),
})
// WebView.onMessage: handle(event.nativeEvent.data), only for the merchant checkout URL.

if (handle.sessionId) {
  const command = createBridgeCommand(
    'PAYMENT_CANCEL',
    {},
    {
      sessionId: handle.sessionId,
      id: 'native:1', // unique within this session
    },
  )
  webview.injectJavaScript(createCommandScript(command))
}
```

Как работают сессии и команды:

- Каждая команда должна содержать id сессии из сообщения `PAYMENT_READY`, а не какой-то id, придуманный в приложении.
- Страница отклоняет команды из другой сессии, команды с повторяющимся id, повреждённые данные и команды, отправленные из фреймов провайдера.
- На команду `ping` приходит `PAYMENT_READY` с id команды в поле `correlationId`.
- Приложение забывает старую сессию только тогда, когда приходит новое `PAYMENT_READY`. Повторные события отбрасываются.

Правила безопасности:

- Собирайте команды через `createCommandScript`. Не вставляйте токен возврата в строку JavaScript вручную. Функция передаёт параметры как данные и работает с `WebView.injectJavaScript`.
- В `onMessage` принимайте сообщения только с адреса своей страницы оплаты — даже если WebView разрешено открывать страницы банка.

**Навигация.** `createNavigationPolicy({ allow, openExternally, returnScheme })` сравнивает HTTPS-origin и целые папки в пути: разрешение `/checkout` **не** разрешает `/checkout-admin`. Когда приходит ссылка возврата с вашей схемой, разберите её через `parseReturnDeepLink` и отправьте `PAYMENT_RESUME` с полученными параметрами. После этого страница заново читает заказ с вашего сервера. Сама ссылка возврата не означает, что оплата прошла.

[Пример мобильного приложения](https://github.com/pavel-labs/checkout-kit/tree/main/examples/react-native-checkout) · [Руководство по WebView](https://pavel-labs.github.io/checkout-kit/ru/webview.html)

## Навигация и ссылки возврата {#navigation-and-return-handling}

Для каждого адреса, который WebView хочет открыть, примите одно из четырёх решений:

1. **Разрешить** в WebView — ваши страницы оплаты и разрешённые страницы провайдера.
2. **Открыть снаружи** — в системном браузере телефона или в другом приложении.
3. **Заблокировать и продолжить оплату** — для ссылки возврата с вашей схемой: не открывать её, а разобрать и отправить `PAYMENT_RESUME`.
4. **Отклонить** — всё остальное.

Сравнивайте точные origin и целые папки в пути. Адреса с логином или паролем внутри запрещены.

Установите обработчик ссылок возврата в приложении **до того**, как начнётся шаг SDK или перенаправление:

- обрабатывайте и ссылку, которой открыли приложение (начальный URL из `Linking`), и ссылки, пришедшие позже;
- ссылки возврата, пришедшие до `PAYMENT_READY`, складывайте в очередь;
- сбрасывайте флаг «готово», когда в WebView загружается новая страница.

Перенаправление методом POST передаёт ещё и поля формы. Его нельзя заменить простым открытием адреса.

## Проверка на настоящем устройстве {#verify-on-the-actual-device}

[Пример на React Native](../../examples/react-native-checkout/README.md) показывает работу с сессиями, очередь ссылок возврата и фильтрацию в `onMessage`. Зависимости React Native и WebView, а также регистрация вашей схемы ссылок относятся к вашему приложению. Соберите приложение и проверьте его на iOS и Android: тесты в браузере и Node мобильное приложение не собирают.
