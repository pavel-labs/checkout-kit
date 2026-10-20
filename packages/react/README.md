# @checkout-kit/react

Connects the checkout kit engine to a React 19 app. It gives you:

- a context provider, so components can reach the engine;
- hooks that subscribe to the engine state;
- ready payment UI states;
- a place on the page (`PaymentActionHost`) where extra steps, such as a bank page, are shown.

Create the engine **once**, where your checkout is set up — not inside a component that re-renders. Otherwise a re-render can lose a payment that is in progress.

This package needs `@checkout-kit/core`, `@checkout-kit/runtime-browser` and React 19.

## Install from npm

```bash
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/react react@^19 react-dom@^19
```

[npm package](https://www.npmjs.com/package/@checkout-kit/react) · [Installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html#install-from-npm)

```tsx
import { CheckoutProvider, PaymentActionHost, useCheckout } from '@checkout-kit/react'
import type { CheckoutEngine } from '@checkout-kit/core'

function Payment() {
  const { engine, phase, isBusy, error } = useCheckout()
  return (
    <>
      <p aria-live="polite">{phase}</p>
      {error && <p role="alert">{error.message}</p>}
      <button disabled={isBusy} onClick={() => engine.reset()}>
        Start over
      </button>
      <PaymentActionHost />
    </>
  )
}

export function Checkout({ engine }: { engine: CheckoutEngine }) {
  return (
    <CheckoutProvider engine={engine}>
      <Payment />
    </CheckoutProvider>
  )
}
```

- To pay, call `engine.pay({ input: { planId }, instrument })`. The instrument depends on the provider: for example, a Stripe PaymentMethod token, or `{ kind: 'none' }` for PayPal.
- `PaymentActionHost` starts waiting steps and shows the visible ones. Put it in a part of the page that does not disappear during the payment.
- With `autoRun={false}`, your app calls `engine.runPendingAction()` itself.

## Hooks

| Hook                                         | What it is for                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `useCheckoutEngine()`                        | Call engine commands without re-rendering on state changes.              |
| `useCheckoutSnapshot()`                      | Read the current engine state (an immutable snapshot).                   |
| `useCheckout()`                              | The state plus the flags `isBusy`, `isSettled`, `isLocked`.              |
| `useCheckoutSelector(selector, isEqual?)`    | Read only one derived value. Object results are cached per snapshot.     |
| `usePaymentState({ isDirty, isValidating })` | Combine your form state (edited, being validated) with the engine phase. |

```tsx
const summary = useCheckoutSelector(
  (s) => ({ amount: s.intent?.amount, currency: s.intent?.currency }),
  (a, b) => a.amount === b.amount && a.currency === b.currency,
)
```

Things to keep in mind:

- `isLocked` is also `true` in final phases. Use it to lock payment inputs, but not the button that starts a new attempt.
- Call `reset` only when the shopper really wants to start over.
- A component appearing on the screen does not confirm anything. Success comes from your server API.

`CheckoutRoot` (optional) adds the UI theme, platform and density attributes. Import `@checkout-kit/ui/styles.css` when you use UI components. The bindings and the UI can render on the server; create the browser runtime only once the browser is available.

[React guide](https://pavel-labs.github.io/checkout-kit/react.html) · [API](https://pavel-labs.github.io/checkout-kit/api/react/)
