# WebView и нативный хост

> [English](../webview.md)

`@checkout-kit/webview-bridge` связывает веб-чекаут с React Native WebView. Native code импортирует /host или /protocol без DOM и React Native dependency; root используется в странице.

## Страница

```ts
import { createWebViewBridge } from '@checkout-kit/webview-bridge'
const bridge = createWebViewBridge(engine, { reportHeight: true })
// На завершении жизни документа: bridge.stop()
```

Без ReactNativeWebView bridge ничего не делает. Внутри WebView отправляет PAYMENT_READY, state/action и проверенные outcomes. Card fields/SDK payload не копируются. OnError сообщает о доставке без изменения оплаты.

## Команды хоста

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

ShowReceipt и webview принадлежат host app. Передавайте данные onMessage в handle только с URL документа мерчанта. Session берётся из PAYMENT_READY, id команды уникален. Чужая session, повтор id, malformed payload и provider frame отвергаются. Ping возвращает ready с correlationId.

CreateCommandScript сериализует параметры данными; не интерполируйте token в исполняемый JS. Handler принимает новую session только по ready и игнорирует повторные события.

## Навигация и возврат

CreateNavigationPolicy({ allow, openExternally, returnScheme }) сравнивает exact origin и границу директории: /checkout не разрешает /checkout-admin. URL credentials запрещены.

Разберите четыре решения: разрешённая merchant/provider page остаётся в WebView; external URL открывается ОС; custom-scheme return блокируется, разбирается parseReturnDeepLink и передаётся PAYMENT_RESUME; остальные URL запрещаются.

Навигация банка не делает его сообщения авторитетными: onMessage фильтруется отдельно. Deep link передаёт evidence, не доказательство успеха. POST redirect содержит form fields; его нельзя заменить одним URL.

## Время жизни и устройства

До навигации установите обработчик initial Linking URL и будущих событий. Сохраняйте return до PAYMENT_READY, сбрасывайте readiness при новой загрузке документа. Resume перечитывает merchant order.

[Нативный пример](../../examples/react-native-checkout/README.md) реализует очереди, session ids и безопасные команды. React Native/WebView dependencies, scheme registration и сборки iOS/Android принадлежат host app. Node/browser tests не заменяют запуск на устройстве.

[Runtime](./runtime.md) · [Решение проблем](./troubleshooting.md)
