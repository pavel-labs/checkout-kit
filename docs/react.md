# React checkout

> [Русская версия](./ru/react.md)

`@checkout-kit/react` connects the payment engine to a React 19 app. It does not replace your server API or your form fields. The optional UI kit gives you ready-made visuals, but your own design system works with the same hooks just as well.

## A complete small example {#complete-example}

Copy these two files into your project as `quickstart-engine.ts` and `quickstart.tsx`. They are real files from the repository, and the TypeScript build checks them, so they always work. You also need the [PayPal routes on your server](./providers/paypal.md). Create the engine once in the browser and start the app with [this code](./getting-started.md#connect-your-app).

Engine setup:

<<< @/../examples/react/quickstart-engine.ts

React screen:

<<< @/../examples/react/quickstart.tsx

How the example works:

- the server sets the price from `planId`; `Money` only shows it;
- `PaymentActionHost` runs the PayPal approval step;
- if the result is unclear (for example, the network failed), the "try again" button repeats recovery or the same attempt, so the shopper is not charged twice;
- "start over" appears only when the payment has a confirmed final status.

## How long the engine lives {#engine-lifetime}

Create **one** engine per checkout, **outside** of rendering (not inside a component body). If you create a new engine on every render, you lose subscriptions and the payment that is in progress.

Keep `PaymentActionHost` on the screen while its step is running. If it disappears, the step stops.

- `CheckoutProvider` gives the engine to the hooks below it.
- `CheckoutRoot` adds the CSS theme, density and platform attributes.

If you use your own UI instead of `@checkout-kit/ui`, you only need `CheckoutProvider`.

## Read only the state you need {#subscribe-to-the-state-you-need}

| Hook                                         | What it returns                                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `useCheckoutEngine()`                        | The engine's commands. The component does not re-render on state changes.                           |
| `useCheckoutSnapshot()`                      | The current state: phase, payment, step, error, provider and what it supports.                      |
| `useCheckout()`                              | The state plus the engine and the flags `isBusy`, `isSettled` and `isLocked`.                       |
| `useCheckoutSelector(selector, isEqual?)`    | Only the part you choose. Re-renders only when that part changes. You can pass your own comparison. |
| `usePaymentState({ isDirty, isValidating })` | A state that also knows about your form (changed, being validated).                                 |

```tsx
import { useCheckoutSelector } from '@checkout-kit/react'
const total = useCheckoutSelector(
  (s) => ({ amount: s.intent?.amount, currency: s.intent?.currency }),
  (a, b) => a.amount === b.amount && a.currency === b.currency,
)
```

Rules and pitfalls:

- a selector must only read data, without side effects;
- `isSettled` means "the engine has stopped". This includes failures and unclear results. It does **not** mean "paid";
- `isLocked` is also `true` in final states. Do not use it alone to disable the retry button forever — add your own condition for recovery or a new attempt.

## Extra steps and recovery {#actions-and-recovery}

- `PaymentActionHost` starts the step on its own (`autoRun` is on by default).
- `surface` lets you choose where to show the step, if the provider supports it.
- `onSettled` is only for the interface: show a message, go to another page. Delivering the order is the server's job.
- With `autoRun={false}`, call `engine.runPendingAction` yourself and pass a mount.

The component protects against running the same step twice, even when the provider sends several steps in a row with the same id.

You can render React and UI components on the server (SSR), but create the browser runtime only in the browser. See [runtime](./runtime.md) and [troubleshooting](./troubleshooting.md).
