# Окружение референсного симулятора

> [English](../../plugins/setup.md)

Здесь запускаются шесть общих протоколов. Для конкретных адаптеров и official SDK используйте [быстрый старт](../getting-started.md) и [сервер мерчанта](../merchant-integration.md).

## Запуск

Нужны Node.js 24 и npm:

```sh
npm ci
npm run dev:mock
# В другом терминале:
npm run dev:bank
```

Откройте `https://localhost:5100/` и примите локальный сертификат, затем URL Vite. MSW worker обрабатывает merchant requests, страницы банка имеют отдельный HTTPS origin. Account keys не нужны. [Демо сайта](/demo/) содержит оба симулятора.

| Карта                 | Результат                     |
| --------------------- | ----------------------------- |
| `4242 4242 4242 4242` | Одобрение.                    |
| `4000 0000 0000 0002` | Отказ.                        |
| `4000 0000 0000 9995` | Недостаточно средств.         |
| `4000 0025 0000 3155` | Challenge проходит.           |
| `4000 0084 0000 1629` | Challenge отклонён.           |
| `4000 0000 0000 9979` | Processing, затем завершение. |

Hosted/wallet выбирают исход в симуляторе вместо отправки карты. [Тестирование](../testing.md) описывает state и recovery.

## Установка и config

[Архивы и peers](../getting-started.md#install-package-archives) устанавливаются вместе. В браузере нужны core, runtime и provider; React 19 добавляет bindings/UI. См. [каталог](../packages.md).

Импортируйте styles.css и CheckoutRoot / .ck-root. Для Tailwind порядок layers:

```css
@layer theme, base, components, checkout, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import '@checkout-kit/ui/styles.css';
@import 'tailwindcss/utilities.css' layer(utilities);
```

Пакеты — ESM. Config type регистрирует id, dynamic import загружает модуль. Core работает без DOM, browser runtime создаётся на клиенте. Библиотека получает config, не читая env. VITE_ публичны; секреты остаются на сервере. BaseUrl указывает на API мерчанта; origin frame/банка точный. В настоящем checkout не запускается demo mock worker.

## Возврат

ReturnPath включает deployed base. Engine получает runtime.runners, runtime.storage, runtime.returnUrl. На маршруте отдаётся app и вызывается hydrate(runtime.readReturnParams). Iframe требует action host, wallet — SDK adapter.

[Точка сборки](../../../apps/demo/src/app/providers/checkout.ts) · [Runtime](../runtime.md) · [Решение проблем](../troubleshooting.md)
