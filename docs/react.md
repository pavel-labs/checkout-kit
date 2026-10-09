# React checkout

> [Русская версия](./ru/react.md)

`@checkout-kit/react` binds an application engine to React 19 without owning your merchant API or fields. The optional UI kit supplies visuals; your own design system works with the same bindings.

## A complete small example {#complete-example}

Copy these modules as `quickstart-engine.ts` and `quickstart.tsx`. They are checked by the examples TypeScript build. Supply the [PayPal merchant API](./providers/paypal.md), create the engine once in the browser and use [the startup code](./getting-started.md#connect-your-app).

Engine setup:

<<< @/../examples/react/quickstart-engine.ts

React screen:

<<< @/../examples/react/quickstart.tsx

The server derives the price from `planId`. `Money` shows its result; `PaymentActionHost` executes approval. An unresolved failure retries recovery/the same attempt. Start over is available only for a verified final intent, preserving uncertain payment identity.

## Engine lifetime

Create one engine per checkout outside the rendering path. A new engine on every render loses subscriptions and in-flight state. Keep the action host mounted while its visible runner executes.

`CheckoutProvider` supplies context; `CheckoutRoot` supplies CSS theme, density and platform attributes. A custom UI needs only the provider.

## Subscribe to the state you need

| Hook | Returns |
| --- | --- |
| `useCheckoutEngine()` | Command API without a state subscription. |
| `useCheckoutSnapshot()` | Immutable phase, intent, action, error, provider and capabilities. |
| `useCheckout()` | Snapshot plus engine, `isBusy`, `isSettled` and `isLocked`. |
| `useCheckoutSelector(selector, isEqual?)` | Cached selection, supporting objects and custom equality. |
| `usePaymentState({ isDirty, isValidating })` | Form-aware state layered over the engine. |

~~~tsx
import { useCheckoutSelector } from '@checkout-kit/react'
const total = useCheckoutSelector(
  (s) => ({ amount: s.intent?.amount, currency: s.intent?.currency }),
  (a, b) => a.amount === b.amount && a.currency === b.currency,
)
~~~

Keep selectors pure. `isSettled` means the engine stopped advancing and includes failed/unresolved attempts; it is not payment proof. `isLocked` includes terminal phases. Use a separate recovery or fresh-attempt condition rather than permanently disabling retry.

## Actions and recovery

`PaymentActionHost` defaults to `autoRun`. `surface` can override a supported surface. `onSettled` is a UI/navigation hook; fulfillment belongs to the server. With `autoRun={false}`, call `engine.runPendingAction` and supply a mount.

Effects guard repeated execution, including chained actions reusing an id. React/UI can render on the server, but browser runtime must be instantiated on the client. See [runtime](./runtime.md) and [troubleshooting](./troubleshooting.md).
