# @checkout-kit/ui

Ready-made checkout components for React 19. Take only what you need: buttons and fields, payment states, order summary, saved cards, dialogs, transfer codes and design tokens.

The components only **show** the payment state your app gives them. They do not take money and do not load prices.

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

- `CheckoutRoot` from `@checkout-kit/react` is optional. A plain `<div className="ck-root" data-ck-theme="light">` also works: all styles apply only inside this element.
- Import the stylesheet once, in the file where your app starts. The package keeps this import in its published exports.

## Choose what to import

| Import                        | What is inside                                                      |
| ----------------------------- | ------------------------------------------------------------------- |
| `@checkout-kit/ui`            | Forms, layout, messages, payment states and appearance helpers.     |
| `@checkout-kit/ui/card`       | Optional masked card fields that you own (not the provider's).      |
| `@checkout-kit/ui/states`     | Building blocks for payment states.                                 |
| `@checkout-kit/ui/layout`     | Checkout layout components.                                         |
| `@checkout-kit/ui/styles.css` | Styles, themes and platform variants, limited to the checkout root. |

If your provider offers its own secure card fields, use its SDK components. `CardFields` does **not** turn a card into a token and does not replace the provider's fields.

## Component notes

- **`InputGroup`** wraps a native `Input` to add an icon, a suffix or a "clear" button.
- **`IconButton`** needs a translated `label`. It behaves like `Button` in forms and has the same tap area.
- Put `Field` control props and form library refs on the input itself.
- **`busy`** keeps focus on a button while the form is being sent. **`disabled`** is for an option that is not available.
- **`Dialog`** is controlled by `open`. `onClose` asks to close it, once per dismissal. The visible close button gets its text from `closeLabel`. `dismissible={false}` hides that button and ignores Escape and clicks on the backdrop. A description becomes the dialog's accessible description.
- **`Countdown`** calls `onExpire` once per deadline, also in React StrictMode. This only tells the UI that time is up: check the server before you decide what happened to the payment.
- For static examples of results, use `SuccessState autoFocus={false}`, `FailureState autoFocus={false}` and `PaymentStatus announce={false}`. For real payment results, focus and announcements stay on by default.

Amounts for `Money` and `OrderSummary` are in minor units (for example, cents), as your server API returns them. Accessible labels, error messages and translated texts are up to your app. Components support server-side rendering; browser-only APIs are used only in effects or event handlers.

[Live gallery](https://pavel-labs.github.io/checkout-kit/demo/gallery) · [UI guide](https://pavel-labs.github.io/checkout-kit/ui.html) · [Installation](https://pavel-labs.github.io/checkout-kit/getting-started.html)
