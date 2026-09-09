# The UI kit

> Русская версия: [ui.ru.md](./ui.ru.md)

`@checkout-kit/ui` is the visible half of the checkout: the fields a shopper types a card
into, the screens a payment moves through, and the tokens that make it look like your
product rather than like a library.

It is plain CSS and plain React. No framework, no CSS-in-JS, no icon package, no runtime
dependencies at all.

```tsx
import '@checkout-kit/ui/styles.css'
```

Then put `ck-root` on a wrapper, or use `CheckoutRoot`, which also carries the theme and the
platform:

```tsx
import { CheckoutRoot } from '@checkout-kit/react'

;<CheckoutRoot theme="auto">…</CheckoutRoot>
```

Everything is scoped under that element, and it all sits in a `checkout` cascade layer, so
your own CSS wins without a specificity fight. If you use layers too, say where ours goes:

```css
@layer theme, base, components, checkout, utilities;
```

With Tailwind that means importing its parts, so the kit lands after preflight - which would
otherwise reset the buttons it draws - and before utilities:

```css
@layer theme, base, components, checkout, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import '@checkout-kit/ui/styles.css';
@import 'tailwindcss/utilities.css' layer(utilities);
```

## Theming

Three tiers of custom property. You normally touch one of them.

```text
  --ck-p-accent-500: #aa3bff       primitives   the raw ramps
          |
          v
  --ck-accent                      semantics    what the rules read
  --ck-accent-hover  (derived)
  --ck-accent-subtle (derived)
  --ck-focus-ring-color
          |
          v
  --ck-button-radius               per-component knobs
  --ck-input-height
```

Move a primitive and everything below it moves. Set a semantic token and only that changes.

**Rebrand everything** by moving the accent. The hover, pressed, subtle and focus tones are
derived from it, so they move together and stay in step:

```css
.ck-root {
  --ck-p-accent-500: #0a7;
}
```

**Change one thing** by setting the semantic token for it:

```css
.ck-root {
  --ck-radius: 8px;
  --ck-control-height: 3rem;
  --ck-font: 'Inter', system-ui, sans-serif;
}
```

The semantic tier is what the rules read: `--ck-accent`, `--ck-surface{,-raised,-sunken}`,
`--ck-border{,-strong}`, `--ck-text{,-muted,-subtle}`, `--ck-danger`, `--ck-success`, plus
scales for space (`--ck-space-1…12`), type (`--ck-font-size-xs…2xl`), radius, control
heights, focus ring and motion. The primitive tier underneath (`--ck-p-*`) is the raw ramps.

One is worth knowing by name. `--ck-scrim` is what the sticky action bar fades into. The kit
cannot know your page's real background, so override it if the default is wrong:

```css
.ck-root {
  --ck-scrim: #fff;
}
```

**From JavaScript**, if your brand lives in a token pipeline rather than a stylesheet.
`appearanceToStyle()` returns the same properties you would have written by hand:

```tsx
import { appearanceToStyle } from '@checkout-kit/ui'

;<CheckoutRoot theme="auto" style={appearanceToStyle({ accent: '#0a7', radius: 8 })}>
```

Numbers are pixels, strings are used as written. Anything it does not cover is still one
line of CSS on `.ck-root`.

**Density.** `<CheckoutRoot density="compact">` tightens the gaps and control heights, for a
checkout embedded in someone else's page or running in a WebView. The minimum tap target does
not move with it: a tight layout is a choice, a target too small to hit is not.

**Light and dark.** Dark is the default. Set `data-ck-theme="light"` for light, or
`data-ck-theme="auto"` to follow the system. Only the semantic tier is redefined, so a light
theme is the same brand rather than a second one.

```html
<div class="ck-root" data-ck-theme="auto">…</div>
```

**Motion, contrast and touch** are handled through the same tokens: one
`prefers-reduced-motion` block sets every duration to nothing, because no rule hard-codes
one; `prefers-contrast: more` strengthens borders and the focus ring; `pointer: coarse`
raises the minimum tap target to 48px.

**Platform conventions.** An iPhone and an Android disagree about the font, the corner
radius and what a press looks like, and CSS cannot see which one it is on. `CheckoutRoot`
detects it; without React, call `applyPlatform(root)` from `@checkout-kit/runtime-browser`
once at startup. Pin it with `platform="ios"` to check a layout, or leave the attribute off
entirely and everything falls back to the desktop values.

Everything else - touch, hover, colour scheme, contrast, motion - stays a media query,
because those the browser does know.

**Layout is measured against the container, not the window.** `.ck-root` is a container, and
every layout decision is a container query. The same checkout renders full-page, in a 360px
WebView and inside a merchant iframe of unknown width - a viewport query is wrong in two of
those three.

## The components

You can see all of it in the demo's
[`/gallery`](https://themafia98.github.io/checkout-kit/gallery) route: every component on one
page, with switches for theme, platform, density and accent.

Where the main ones sit on a checkout screen:

```text
+--------------------------------------+  +------------------+
|  Steps                               |  |  Panel           |
|                                      |  |   OrderSummary   |
|  ExpressCheckout                     |  |    LineItem      |
|  ---------- Divider "or" ----------  |  |    LineItem      |
|                                      |  |    DetailItem    |
|  Section "Contact"                   |  |     (total)      |
|   ContactFields                      |  |   PromoCodeInput |
|                                      |  +------------------+
|  Section "Payment method"            |
|   PaymentMethodSelector              |     aside: above the form on a
|   SavedInstrumentList                |     phone, beside it from 48rem
|                                      |
|  Section "Card details"              |
|   CardFields                         |
|    Field > CardNumberInput           |
|    Field > ExpiryInput | CvcInput    |
|   Disclosure "What is a CVC?"        |
|                                      |
|  Section "Billing address"           |
|   AddressFields                      |
|   Checkbox "Save this card"          |
|                                      |
|  ActionFrame  <- a provider draws here
|                                      |
|  ValidationSummary                   |
|  StickyActions                       |
|   PaymentStatus / ErrorText          |
|   PaymentButton                      |
|   TrustStrip                         |
+--------------------------------------+
```

The payment then ends on one of the state screens - `ProcessingState`,
`AuthenticationState`, `SuccessState`, `FailureState` - which replace the form rather than
sit inside it.

**Form.** `Field` is the one to know. It gives a control an id, points the label at it, and
names the hint and the error in `aria-describedby`. Every input in the kit goes through it,
which is why no screen has to remember to do it.

```tsx
<Field label="Email" hint="Where the receipt goes" error={errors.email?.message} required>
  {(control) => <Input {...control} type="email" autoComplete="email" />}
</Field>
```

`FieldGroup` is a `<fieldset>` for fields that ask one question together, like a billing
address, and `FieldRow` pairs two short ones side by side once there is room for both - and
lines their controls up even when only one of them carries a hint.

Besides `Input` there is `Select`, `Textarea` and `Checkbox`. `Checkbox` does not go through
`Field`: its label belongs beside the box, not above it, so it takes its own `label`,
`description` and `error`. It is what accepts terms and saves cards.

**Address and contact.** `AddressFields` and `ContactFields` exist for one reason:
`autocomplete`. Every token they set is one a browser recognises, and one wrong token turns
autofill off for the whole form. The country list is yours - the kit ships no data.
`autoCompleteSection` keeps a billing and a shipping address filling separately.

**Money.** Amounts travel in minor units. `formatMoney` in `@checkout-kit/core` turns them
into what a shopper reads, asking `Intl` how many minor units a currency has instead of
carrying a table. That is the part hand-written formatters get wrong: JPY has none, KWD has
three. `<Money amount={1999} currency="USD" />` renders it with tabular figures.

`OrderSummary` puts the lines together. It does no arithmetic - subtotals, tax and discounts
arrive already worked out, because where the rounding lands is your tax logic's business.

**The rest.** `PromoCodeInput` (an input with an apply button; not a nested `<form>`),
`SavedInstrumentList` (an expired card is shown disabled, not hidden, so someone looking for
it can see why), `ExpressCheckout` (a slot row and a rule - every wallet mandates its own
button, so you bring the one their SDK draws), `TrustStrip`, `Steps`, `Skeleton`,
`SkeletonText`, `Countdown` (for `action.expiresAt`; silent while it runs, announced when it
expires), `CopyButton`, `Disclosure`, `Divider`, `Panel` and `Receipt`.

`Dialog` is a real `<dialog>` opened with `showModal()`. That is why the kit has no
focus-trap code: focus, Tab, inertness, Escape and focus restore are all the browser's.
`variant="sheet"` slides it up from the bottom edge, where a thumb can reach it.

`ValidationSummary` is the other half of `Field`'s polite errors. Since those do not
interrupt, nothing otherwise says how many problems a long form has on submit. It takes
focus, counts them, and links each to its field.

**Card entry.** `CardNumberInput`, `ExpiryInput`, `CvcInput`, `CardholderInput`, laid out by
`CardFields`. They format as you type without throwing the caret to the end, group the
digits the way the brand prints them - 4-6-5 the moment an Amex prefix appears - and take
their lengths from the same rules the validator uses, so a mask and a message can never
disagree. The brand shows as a text badge; scheme logos are trademarks, so pass your own
through `icons` if you have the licence.

**Choice.** `OptionCardGroup` and `OptionCard` are real radio buttons, hidden and styled
through `:has(:checked)`. Arrow keys, form semantics and the screen-reader announcement come
from the browser. `PaymentMethodSelector` is the same thing with payment metadata, and the
methods come from you - the kit has no list of its own.

```tsx
<PaymentMethodSelector
  methods={[
    { id: 'card', label: 'Card', description: 'Visa, Mastercard, Amex' },
    { id: 'transfer', label: 'Bank transfer', badge: 'Instant' },
  ]}
  value={method}
  onChange={setMethod}
/>
```

**Payment.** `PaymentStatus` is the single live region on the page: what happens to the money
is what gets announced, and field errors stay polite so they do not drown it out.
`PaymentButton` shows a spinner and stops responding while a payment runs, but keeps its
label and its focus - a label that changes mid-payment moves the target under the cursor,
and a disabled button drops focus to the top of the page.

`ProcessingState`, `AuthenticationState`, `SuccessState` and `FailureState` are the screens a
payment ends on. Each leads with a heading and takes focus on arrival, so a screen reader
starts at the answer. Cancellation is a tone of `FailureState`, not a fifth screen.

`CheckoutLayout` is the column, with an optional `aside` for an order summary: above the
form on a phone, sticky beside it from 48rem. `ck-panel` is an opt-in raised surface for
whatever goes in it.

`ActionFrame` is where a provider draws. Three variants, because a hosted field frame, a bank
page and a QR code want three different sizes:

```tsx
<ActionFrame variant="challenge">
  <PaymentActionHost className="ck-action-host" />
</ActionFrame>
```

## Accessibility, and where the line is

The kit gives you: a label and an error tied to every field, one alert and one status region
rather than a scatter of them, a visible focus ring on every control, a real tab pattern with
arrow keys, radio groups the keyboard can reach, tap targets no smaller than 44px, and state
screens that take focus.

You still own: where focus goes when your routes change, and any announcement that belongs to
your layout rather than to the payment. The kit does not own your page, so it cannot do those
for you.

## Translation

Every string the kit renders can be replaced. There is no i18n library in here, and no
opinion about which one you use.

```tsx
<PaymentStatus state={state} messages={{ processing: t('checkout.processing') }} />
<PaymentButton state={state}>{t('checkout.pay')}</PaymentButton>
<SuccessState heading={t('checkout.paid')} />
```

The runners in `@checkout-kit/runtime-browser` take their strings the same way - see
`createBrowserRuntime({ redirect: { frameTitle }, display: { text } })`.

What you should not translate is `PaymentError.message`: those are the issuer words, and
they are what the shopper repeats to their bank. Branch on `PaymentError.code` if you need
your own wording, and fall back to the message for codes you do not know.
