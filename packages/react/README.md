# @checkout-kit/react

React 19 bindings for a host-owned checkout engine: context, store subscriptions, payment UI states and a DOM mount for pending actions. Create the engine once at the checkout composition root so a re-render does not lose an in-flight payment.

Follow the [installation guide](https://pavel-labs.github.io/checkout-kit/getting-started.html). This package peers with `@checkout-kit/core`, `@checkout-kit/runtime-browser` and React 19.

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

Payment submission uses `engine.pay({ input: { planId }, instrument })`. Choose the instrument from your provider's contract: for example a Stripe PaymentMethod token or `{ kind: 'none' }` for PayPal. `PaymentActionHost` starts pending actions and mounts visible ones; place it in a stable part of the checkout. `autoRun={false}` lets the host call `engine.runPendingAction()` itself.

## Hooks

| Hook                                         | Use                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `useCheckoutEngine()`                        | Issue commands without subscribing to state.                             |
| `useCheckoutSnapshot()`                      | Subscribe to the engine's immutable snapshot.                            |
| `useCheckout()`                              | Snapshot plus `isBusy`, `isSettled`, `isLocked`.                         |
| `useCheckoutSelector(selector, isEqual?)`    | Subscribe to a derived value; object selections are cached per snapshot. |
| `usePaymentState({ isDirty, isValidating })` | Layer form editing/validation over the engine phase.                     |

```tsx
const summary = useCheckoutSelector(
  (s) => ({ amount: s.intent?.amount, currency: s.intent?.currency }),
  (a, b) => a.amount === b.amount && a.currency === b.currency,
)
```

`isLocked` includes terminal phases: use it for editable payment inputs, not for the button that starts a fresh attempt. Reset only when the shopper intentionally starts over. Mounting a component does not itself confirm payment; success comes from the merchant API.

`CheckoutRoot` optionally supplies UI theme/platform/density attributes. Import `@checkout-kit/ui/styles.css` when using UI components. The bindings and UI render on the server; create the browser runtime after the browser is available.

[React guide](https://pavel-labs.github.io/checkout-kit/react.html) · [API](https://pavel-labs.github.io/checkout-kit/api/react/)
