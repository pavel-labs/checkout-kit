# Перед приёмом настоящих платежей

> [English](../production.md)

Checkout kit управляет платёжным циклом между провайдером и приложением. Он полезен,
когда нужны повторные попытки, 3DS, redirect, восстановление или общий интерфейс для
нескольких провайдеров. Начните с `core`, одного адаптера и runtime; React и UI необязательны.
Для одного hosted checkout без своего платёжного цикла может хватить решения провайдера.

Новые настройки безопасности и telemetry относятся к текущему исходному коду и следующему
релизу. Старый архив `0.2.0` их не содержит; пока используйте сборку из исходников.

## Что делает библиотека и что делает мерчант

| Возможность      | Checkout kit                                                 | Ваше приложение                                                    |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Платёжный цикл   | Create, confirm, actions, processing, отмена, восстановление | Capture policy и запрет конфликтующих попыток на сервере           |
| Сбор инструмента | SDK adapters, hosted fields, необязательные UI-компоненты    | Официальные поля/SDK; generic card form меняет PCI scope           |
| Повторы          | Сохранение ключа попытки и корреляция action/evidence        | Атомарная долговечная idempotency по покупателю, заказу и операции |
| Результат        | Чтение и отображение состояния merchant API                  | Проверенные уведомления и сверка после закрытия браузера           |
| Адреса           | HTTPS, origin policy, ограничения загрузки SDK               | Разрешённые адреса и CSP своего провайдера/account                 |
| Диагностика      | Telemetry без платёжного payload и исполняемые контракты     | Мониторинг, выдача покупки и sandbox-проверка                      |

Библиотека не является процессингом, escrow, anti-fraud или PCI-сертификацией.
Конкретные адаптеры проверены на fixtures и локальных симуляторах; это не проверка вашего
живого sandbox-account. Шесть generic protocol packages — референсы для своей интеграции.

## Безопасная настройка браузера

```ts
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'

const runtime = createBrowserRuntime({
  returnPath: '/checkout/return',
  security: {
    frameOrigins: ['https://fields.your-provider.example'],
    scriptOrigins: [], // SDK импортируется самим приложением.
    imageOrigins: ['https://images.your-provider.example'],
    deeplinkProtocols: ['yourbank:'], // Только если это нужно вашему банку.
  },
})
```

Домены здесь — placeholders. Подставьте документированные origin своего провайдера.
`redirectOrigins` ограничивает переходы точными origin; без этого списка разрешены HTTPS
redirect, поскольку ACS разных эмитентов имеют разные домены. Пустой список запрещает
категорию. Wildcard/suffix matching отсутствует. Разрешение origin доверяет всем его путям;
не разрешайте SDK с origin, на котором пользователи могут размещать собственные скрипты.

По умолчанию запрещены HTTP, credentials в URL, исполняемые схемы, незаявленные SDK scripts
и custom app schemes. Return URL должен относиться к origin приложения. Сообщения iframe
проверяются по origin, sender, type и action id; hosted fields требуют совпадения URL origin
и message origin. Ошибка возвращает `aborted/runner_error` до навигации/рендера.
`allowInsecureLocalhost: true` разрешает HTTP только на loopback для локальной разработки.

Предпочтителен прямой импорт SDK. Для `scriptUrl` разрешите точный `scriptOrigins` и задайте
`integrity`, если SDK поддерживает фиксированную версию. Настройте CSP по инструкции провайдера.
Same-origin iframe с `allow-scripts` и `allow-same-origin` не изолирует вредоносный код этого
origin. Браузерные проверки дополняют сервер; они не защищают скомпрометированный merchant host.

## Не передавайте карточные данные через приложение

Stripe принимает PaymentMethod token. В Adyen используйте encrypted `state.data` из Adyen Web
или сохранённый метод. Raw `card` и `number`/`cvc` в component data запрещены, пока явно не
задано `allowRawCardData: true`; этот флаг не устанавливает PCI-право на такой сбор.
Пример merchant server всегда отклоняет raw путь. Generic card UI/reference adapters работают
с карточными полями; используйте их только после проверки соответствующего merchant scope.

PAN, CVC, wallet token, client secret, action params и полный return URL не должны попадать
в аналитику, логи, support attachments или storage. Низкоуровневые events содержат provider
data; для метрик используйте [безопасную telemetry](./observability.md).
Recovery storage оставляет provider/intent/action id, attempt key и timestamp. Это недоверенный
ввод: сервер всё равно проверяет владельца, срок действия и привязку action к платежу.

## Неопределённый результат остаётся неопределённым

| Ситуация                                      | Действие                                                         |
| --------------------------------------------- | ---------------------------------------------------------------- |
| Ответ create/confirm потерян                  | Сохранить ключ попытки и прочитать/сверить прежний платёж        |
| Processing                                    | Продолжить status checks, не создавать второй платёж для заказа  |
| Return URL говорит success или SDK завершился | Сверить через авторизованный merchant API                        |
| Пользователь отменил или вызвал reset         | Проверить, не произошло ли списание; local reset его не отменяет |
| Точно получен decline, выбран новый метод     | Новая попытка по серверной политике заказа                       |

Не повторяйте money-moving POST с новым ключом только из-за timeout. Браузерная память
не координирует другие вкладки, устройства и workers. Сервер обеспечивает один платёж
на заказ и долговечно хранит ключи/результаты.

## Проверьте серверную границу

1. Авторизация каждого чтения, изменения и receipt по владельцу заказа.
2. Цена, валюта, покупатель, provider account и return URL берутся с сервера.
3. HTTPS, secure cookies, явная CSRF policy и узкий CORS allowlist.
4. Подпись webhook по правилам SDK/raw body; account, order, amount/currency и capture state;
   долговечные deduplication и обработка событий не по порядку.
5. Выдача покупки один раз из проверенного merchant state; UI success только для отображения.
6. Настоящий sandbox-account: decline, 3DS/redirect, lost reply, processing, двойной клик,
   конкурентные sessions, чужое evidence, неверная подпись и provider outage.
   Зафиксируйте провайдера, SDK/API version, capture mode и дату проверки.

[Пример сервера](../../examples/server/README.md) использует память процесса и демонстрационную
session cookie: замените их перед deployment. Он проверяет уведомления Adyen; Stripe/PayPal
production notifications и долговечная выдача покупки остаются работой мерчанта.

## Условие публичного релиза

Запустите типы, тесты, проверку consumer archives, composed-site navigation и `release:npm-check`.
Разберите dependency advisories в поставляемых пакетах. Примените changesets, выберите bundle
version и проведите sandbox-review до заявления о production-ready integration.
[Releasing](../../RELEASING.md) описывает npm scope, первую публикацию и OIDC. Наличие GitHub
архива не означает наличия публичного npm package.

[Правила Stripe](https://docs.stripe.com/payments/payment-intents) ·
[Security policy](../../SECURITY.md)
