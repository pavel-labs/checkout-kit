# @checkout-kit/ui

Composable checkout components for React 19. Use as much of the kit as you need: buttons and fields, payment states, order summary, saved instruments, dialogs, transfer codes and appearance tokens. Components render payment state supplied by your app; they do not charge or fetch prices.

```tsx
import '@checkout-kit/ui/styles.css'
import { Button, Money, Panel, appearanceToStyle } from '@checkout-kit/ui'
import { CheckoutRoot } from '@checkout-kit/react'

export function Summary() {
  return (
    <CheckoutRoot theme="auto" style={appearanceToStyle({ accent: '#047857', radius: 8 })}>
      <Panel>
        <Money amount={2500} currency="USD" />
        <Button
          onClick={() => {
            /* submit with your checkout engine */
          }}
        >
          Pay
        </Button>
      </Panel>
    </CheckoutRoot>
  )
}
```

`CheckoutRoot` is an optional convenience from `@checkout-kit/react`. A plain `<div className="ck-root" data-ck-theme="light">` also supplies the CSS scope. Import the stylesheet once in your app entry. The package preserves that import in its published exports.

## Choose a layer

| Import                        | Contents                                                        |
| ----------------------------- | --------------------------------------------------------------- |
| `@checkout-kit/ui`            | Forms, layout, feedback, payment states and appearance helpers. |
| `@checkout-kit/ui/card`       | Optional merchant-owned masked card fields.                     |
| `@checkout-kit/ui/states`     | Payment-state composition.                                      |
| `@checkout-kit/ui/layout`     | Checkout layout components.                                     |
| `@checkout-kit/ui/styles.css` | Scoped styles, themes and platform variants.                    |

For providers offering their own secure fields, use their SDK components. `CardFields` does not tokenize a card or replace provider-hosted fields.

Add `InputGroup` around a native `Input` for an icon, suffix or clear action. `IconButton` requires a localized `label`; it has the same native form behavior and tap target as `Button`. Put Field control props and form-library refs on the input itself.

Use `busy` to keep focus on a submitting button; use `disabled` for an unavailable choice. `Dialog` is controlled by `open`; `onClose` requests a state change once per dismissal. Its visible dismiss button is localized with `closeLabel`; `dismissible={false}` hides it and refuses Escape/backdrop dismissal. A description names the dialog's accessible description. `Countdown` calls `onExpire` once per deadline, including React StrictMode. Expiry is a UI notification: check the server before deciding what happened to the payment.

For static result specimens use `SuccessState autoFocus={false}`, `FailureState autoFocus={false}` and `PaymentStatus announce={false}`. Real payment outcomes retain focus and announcements by default.

Amounts passed to `Money` and `OrderSummary` are minor units from your merchant API. Accessible labels, error messages and locale-specific copy remain under your app's control. Components support SSR; browser-only APIs are used in effects or event handlers.

[Live gallery](https://pavel-labs.github.io/checkout-kit/demo/gallery) · [UI guide](https://pavel-labs.github.io/checkout-kit/ui.html) · [Installation](https://pavel-labs.github.io/checkout-kit/getting-started.html)
