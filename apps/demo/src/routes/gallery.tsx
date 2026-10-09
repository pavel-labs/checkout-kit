import { useState, type CSSProperties, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CheckoutRoot } from '@checkout-kit/react'
import type { Platform } from '@checkout-kit/runtime-browser'
import type { PaymentUiState } from '@checkout-kit/core'
import { CheckoutPreview, type PreviewScreen } from '../ui-gallery/checkout-preview'
import { GalleryIcon } from '../ui-gallery/icons'
import '../ui-gallery/gallery.css'
import {
  ActionFrame,
  AddressFields,
  appearanceToStyle,
  AuthenticationState,
  Badge,
  Button,
  CardFields,
  CardholderInput,
  CardNumberInput,
  Checkbox,
  ContactFields,
  CopyButton,
  Countdown,
  CvcInput,
  DetailItem,
  DetailList,
  Dialog,
  Disclosure,
  Divider,
  ErrorText,
  ExpiryInput,
  ExpressCheckout,
  FailureState,
  Field,
  IconButton,
  Input,
  InputGroup,
  Money,
  OptionCard,
  OptionCardGroup,
  OrderSummary,
  Panel,
  PaymentButton,
  PaymentMethodSelector,
  PaymentStatus,
  ProcessingState,
  PromoCodeInput,
  Receipt,
  SavedInstrumentList,
  Section,
  Select,
  Skeleton,
  SkeletonText,
  Spinner,
  StatusText,
  Steps,
  SuccessState,
  Tab,
  Tabs,
  Textarea,
  TrustStrip,
  ValidationSummary,
} from '@checkout-kit/ui'

// Every component in the kit on one page, under whichever theme, platform and density the
// controls are set to.
//
// A route rather than a Storybook: the kit's claim is that it needs no build step of its own,
// and a workshop that needed a bundler would undercut it. It deploys with the demo.

export const Route = createFileRoute('/gallery')({ component: GalleryPage })

const STATES: PaymentUiState[] = [
  'idle',
  'editing',
  'validating',
  'submitting',
  'processing',
  'requires_action',
  'success',
  'failure',
  'cancelled',
]

const COUNTRIES = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'US', label: 'United States' },
  { value: 'JP', label: 'Japan' },
]

const ACCENTS = [
  { color: '#2563eb', name: 'Blue' },
  { color: '#7c3aed', name: 'Violet' },
  { color: '#047857', name: 'Green' },
  { color: '#be123c', name: 'Rose' },
  { color: '#111827', name: 'Ink' },
] as const

const Row = ({
  title,
  note,
  children,
  wide = false,
}: {
  title: string
  note?: string
  children: ReactNode
  wide?: boolean
}) => (
  <section className={`gallery-specimen${wide ? ' gallery-specimen--wide' : ''}`}>
    <div className="gallery-specimen__header">
      <h3>{title}</h3>
      {note ? <p>{note}</p> : null}
    </div>
    <div className="gallery-specimen__content">{children}</div>
  </section>
)

/** Controls belong to the workshop, outside the checkout being inspected. */
const Control = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="gallery-control">
    {label}
    {children}
  </label>
)

export function GalleryPage() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>('light')
  const [platform, setPlatform] = useState<Platform | 'auto'>('auto')
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [accent, setAccent] = useState<string>(ACCENTS[0].color)
  const [width, setWidth] = useState('full')
  const [screen, setScreen] = useState<PreviewScreen>('ready')

  return (
    <div className="gallery">
      <nav className="gallery-nav" aria-label="Gallery navigation">
        <a className="gallery-brand" href="https://pavel-labs.github.io/checkout-kit/">
          <span aria-hidden="true">ck.</span>checkout-kit
        </a>
        <div className="gallery-nav__links">
          <a href="#components">Components</a>
          <a href="https://pavel-labs.github.io/checkout-kit/ui.html">
            Documentation <span aria-hidden="true">↗</span>
          </a>
          <a href="https://github.com/pavel-labs/checkout-kit">
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </nav>
      <header className="gallery-heading">
        <p className="gallery-eyebrow">The checkout-kit design system</p>
        <h1>Checkout UI, down to the details.</h1>
        <p>
          A complete payment flow and the components behind it. Bring your brand. Keep the native
          behavior.
        </p>
      </header>
      <div className="gallery-toolbar" role="group" aria-label="Appearance controls">
        <Control label="Theme">
          <select value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">System</option>
          </select>
        </Control>
        <Control label="Platform">
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value as typeof platform)}
          >
            <option value="auto">Automatic</option>
            <option value="ios">iOS</option>
            <option value="android">Android</option>
            <option value="desktop">Desktop</option>
          </select>
        </Control>
        <Control label="Density">
          <select
            value={density}
            onChange={(event) => setDensity(event.target.value as typeof density)}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </Control>
        <fieldset className="gallery-accents">
          <legend>Accent</legend>
          <div>
            {ACCENTS.map(({ color, name }) => (
              <button
                key={color}
                type="button"
                aria-label={`${name} accent`}
                aria-pressed={accent === color}
                onClick={() => setAccent(color)}
                style={{ '--gallery-swatch': color } as CSSProperties}
              >
                {accent === color ? <GalleryIcon name="check" /> : null}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <CheckoutRoot
        theme={theme}
        platform={platform}
        density={density}
        style={appearanceToStyle({ accent: accent === '#111827' ? undefined : accent })}
        className={`gallery-kit${accent === '#111827' ? ' gallery-kit--ink' : ''}`}
      >
        <section className="gallery-preview" aria-label="Interactive checkout example">
          <div className="gallery-preview__toolbar">
            <div>
              <span className="gallery-preview__dot" />
              Live component preview
              <span className="gallery-preview__caption">No payment is created</span>
            </div>
            <div className="gallery-preview__controls">
              <Control label="Frame width">
                <select value={width} onChange={(event) => setWidth(event.target.value)}>
                  <option value="full">Responsive</option>
                  <option value="390">Phone · 390px</option>
                  <option value="320">Narrow · 320px</option>
                </select>
              </Control>
              <Control label="Preview state">
                <select
                  value={screen}
                  onChange={(event) => setScreen(event.target.value as PreviewScreen)}
                >
                  <option value="ready">Ready to pay</option>
                  <option value="processing">Processing</option>
                  <option value="success">Success</option>
                  <option value="failure">Declined</option>
                </select>
              </Control>
            </div>
          </div>
          <div className="gallery-preview__stage">
            <div
              className="gallery-preview__viewport"
              style={{ maxWidth: width === 'full' ? '100%' : `${width}px` }}
            >
              <CheckoutPreview screen={screen} onScreenChange={setScreen} />
            </div>
          </div>
        </section>
        <div className="gallery-catalog-heading" id="components">
          <div>
            <p className="gallery-eyebrow">Built to compose</p>
            <h2>The component library</h2>
          </div>
          <p>One set of tokens. Native controls. Every payment state.</p>
        </div>
        <div className="gallery-catalog">
          <Specimens />
        </div>
      </CheckoutRoot>
      <footer className="gallery-footer">
        Plain React. Plain CSS. Yours to make your own.
        <a href="https://pavel-labs.github.io/checkout-kit/ui.html">
          Build your checkout <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </div>
  )
}

function Specimens() {
  const [plan, setPlan] = useState('monthly')
  const [search, setSearch] = useState('')
  const [method, setMethod] = useState('card')
  const [tab, setTab] = useState('one')
  const [number, setNumber] = useState('')
  const [exp, setExp] = useState('')
  const [cvc, setCvc] = useState('')
  const [address, setAddress] = useState({})
  const [contact, setContact] = useState({})
  const [promo, setPromo] = useState('')
  const [applied, setApplied] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>('pm_1')
  const [terms, setTerms] = useState(false)
  const [dialog, setDialog] = useState(false)
  // Pinned once, so the clock does not restart on every re-render of the gallery.
  const [deadline] = useState(() => Date.now() + 9 * 60 * 1000)

  return (
    <>
      <Row
        title="Payment states"
        note="Static specimens; only the active checkout announces updates."
      >
        <div className="flex flex-col gap-2">
          {STATES.map((state) => (
            <div key={state} className="gallery-state-line">
              <code className="gallery-state-line__name">{state}</code>
              <PaymentStatus state={state} announce={false} />
            </div>
          ))}
        </div>
      </Row>

      <Row title="Buttons" note="Focusable while busy. A full tap target, even at compact density.">
        <div className="gallery-button-grid">
          <PaymentButton state="idle" amount="$25.00">
            Pay
          </PaymentButton>
          <PaymentButton state="submitting">Continue payment</PaymentButton>
          <PaymentButton state="idle" disabled>
            Continue payment
          </PaymentButton>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete payment method</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Spinner />
          <Spinner size="md" />
          <Badge>Visa</Badge>
          <Badge tone="accent">Instant</Badge>
          <Badge tone="success">Applied</Badge>
          <Badge tone="danger">Expired</Badge>
          <CopyButton value="GB33BUKB20201555555555" />
        </div>
      </Row>

      <Row
        title="Form controls"
        note="Labels, hints and errors stay connected to the native input."
      >
        <Field label="Receipt email" hint="Leading icon and an accessible clear action">
          {(control) => (
            <InputGroup
              leading={<GalleryIcon name="mail" />}
              trailing={
                <IconButton label="Clear receipt email" onClick={() => setSearch('')}>
                  <GalleryIcon name="close" />
                </IconButton>
              }
            >
              <Input
                {...control}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="you@example.com"
              />
            </InputGroup>
          )}
        </Field>
        <Field label="Email" hint="Where the receipt goes" required>
          {(control) => <Input {...control} placeholder="you@example.com" />}
        </Field>
        <Field label="Postal code" error="Check the postal code for this country" required>
          {(control) => <Input {...control} placeholder="Postal code" />}
        </Field>
        <Field label="Company" optionalText="(optional)">
          {(control) => <Input {...control} />}
        </Field>
        <Field label="Country" required>
          {(control) => <Select {...control} options={COUNTRIES} placeholder="Select a country" />}
        </Field>
        <Field label="Delivery notes" optionalText="(optional)">
          {(control) => <Textarea {...control} placeholder="Leave it with a neighbour" />}
        </Field>
        <Checkbox
          label="Save this card for next time"
          description="Example preference; storage depends on your integration."
        />
        <Checkbox
          label="I accept the terms"
          checked={terms}
          onChange={(event) => setTerms(event.target.checked)}
          error={terms ? undefined : 'You have to accept the terms to pay'}
        />
      </Row>

      <Row title="Card entry" note="Formats as you type without throwing the caret to the end.">
        <CardFields>
          <Field label="Card number" required>
            {(control) => <CardNumberInput {...control} value={number} onChange={setNumber} />}
          </Field>
          <Field label="Name on card" required>
            {(control) => <CardholderInput {...control} />}
          </Field>
          <div className="ck-card-fields__row">
            <Field label="Expiry date" hint="MM / YY" required>
              {(control) => <ExpiryInput {...control} value={exp} onChange={setExp} />}
            </Field>
            <Field label="Security code" required>
              {(control) => <CvcInput {...control} value={cvc} onChange={setCvc} />}
            </Field>
          </div>
        </CardFields>
        <Disclosure summary="What is a security code?">
          The three digits on the back of the card, or four on the front of an Amex.
        </Disclosure>
      </Row>

      <Row
        title="Address and contact"
        note="The kit ships no country list; this one is the host's."
      >
        <ContactFields value={contact} onChange={setContact} />
        <AddressFields value={address} onChange={setAddress} countries={COUNTRIES} />
      </Row>

      <Row title="Choices">
        <PaymentMethodSelector
          methods={[
            { id: 'card', label: 'Card', description: 'Visa, Mastercard, Amex' },
            { id: 'transfer', label: 'Bank transfer', badge: 'Instant' },
            { id: 'later', label: 'Pay later', disabled: true },
          ]}
          value={method}
          onChange={setMethod}
        />
        <OptionCardGroup label="Plan" value={plan} onChange={setPlan}>
          <OptionCard value="monthly" label="Monthly" aside="$25" />
          <OptionCard value="yearly" label="Yearly" badge="Save 32%" aside="$125" />
        </OptionCardGroup>
        <SavedInstrumentList
          instruments={[
            { id: 'pm_1', brand: 'visa', last4: '4242', expiry: '12/30' },
            { id: 'pm_2', brand: 'mastercard', last4: '4444', expiry: '08/29' },
            { id: 'pm_3', brand: 'amex', last4: '0005', expiry: '01/20', expired: true },
          ]}
          value={saved}
          onChange={setSaved}
        />
        <Tabs aria-label="Example" value={tab} onValueChange={setTab}>
          <Tab value="one">One</Tab>
          <Tab value="two">Two</Tab>
          <Tab value="three">Three</Tab>
        </Tabs>
      </Row>

      <Row
        title="Express checkout"
        note="Mount SDK-owned wallet buttons here. These are unbranded layout placeholders."
      >
        <ExpressCheckout layout="row">
          <Button variant="ghost" disabled>
            Wallet SDK slot 1
          </Button>
          <Button variant="ghost" disabled>
            Wallet SDK slot 2
          </Button>
        </ExpressCheckout>
      </Row>

      <Row title="Money and summaries">
        <OrderSummary
          currency="USD"
          locale="en-US"
          items={[
            {
              id: 'team',
              name: 'Team plan',
              amount: 9900,
              quantity: 2,
              description: 'Billed monthly',
            },
            { id: 'onboarding', name: 'Onboarding', value: 'Free' },
          ]}
          adjustments={[
            { id: 'discount', name: 'Discount', amount: -1980 },
            { id: 'tax', name: 'Tax', amount: 1584 },
          ]}
          total={{ id: 'total', name: 'Total due', amount: 197_04 }}
          footer={
            <PromoCodeInput
              value={promo}
              onChange={setPromo}
              onApply={setApplied}
              applied={applied}
              onRemove={() => setApplied(null)}
            />
          }
        />
        <Panel title="Same amount, four locales" description="One formatter, no exponent table.">
          <DetailList>
            <DetailItem
              name="en-US / USD"
              value={<Money amount={1999} currency="USD" locale="en-US" />}
            />
            <DetailItem
              name="de-DE / EUR"
              value={<Money amount={1999} currency="EUR" locale="de-DE" />}
            />
            <DetailItem
              name="ja-JP / JPY"
              value={<Money amount={1999} currency="JPY" locale="ja-JP" />}
            />
            <DetailItem
              name="ar-KW / KWD"
              value={<Money amount={1999} currency="KWD" locale="ar-KW" />}
            />
          </DetailList>
        </Panel>
      </Row>

      <Row title="Progress and waiting">
        <Steps
          steps={[
            { id: 'contact', label: 'Contact' },
            { id: 'address', label: 'Address' },
            { id: 'pay', label: 'Pay' },
          ]}
          current="address"
        />
        <Countdown expiresAt={deadline}>
          {(remaining) => `This code expires in ${remaining}`}
        </Countdown>
        <Panel>
          <SkeletonText lines={3} />
          <div className="flex items-center gap-3">
            <Skeleton width="2.75rem" height="2.75rem" radius="8px" />
            <Skeleton width="40%" />
          </div>
        </Panel>
      </Row>

      <Row title="Problems" note="Field errors stay polite; these two interrupt.">
        <ValidationSummary
          autoFocus={false}
          problems={[
            { fieldId: 'gallery-demo-field', message: 'Enter a card number' },
            { message: 'Choose a country' },
          ]}
        />
        <ErrorText>Your card was declined.</ErrorText>
        <StatusText tone="failure">Declined by the issuer</StatusText>
        <StatusText tone="success">Paid on 3 March</StatusText>
      </Row>

      <Row title="Overlays">
        <Button variant="secondary" fullWidth={false} onClick={() => setDialog(true)}>
          Open a sheet
        </Button>
        <Dialog
          open={dialog}
          onClose={() => setDialog(false)}
          variant="sheet"
          title="Why do you need my address?"
          description="Your bank may use it to verify the payment."
          footer={<Button onClick={() => setDialog(false)}>Got it</Button>}
        >
          Your bank checks it against the address it has on file for the card.
        </Dialog>
      </Row>

      <Row
        title="Screens"
        note="Results, authentication and waiting, with no focus movement in static specimens."
        wide
      >
        <div className="gallery-screen-grid">
          <ProcessingState />
          <AuthenticationState variant="inline" actions={<Button variant="ghost">Cancel</Button>}>
            <div className="grid h-full place-items-center text-muted">the provider draws here</div>
          </AuthenticationState>
          <SuccessState
            autoFocus={false}
            details={
              <Receipt>
                <DetailList>
                  <DetailItem
                    name="Amount"
                    value={<Money amount={2500} currency="USD" locale="en-US" />}
                  />
                  <DetailItem name="Transaction ID" value="pi_123" />
                  <DetailItem name="Paid" value="3 March 2026" total />
                </DetailList>
              </Receipt>
            }
            actions={<Button variant="secondary">Return to store</Button>}
          >
            Thank you. Your payment has gone through.
          </SuccessState>
          <FailureState autoFocus={false} tone="declined" actions={<Button>Try again</Button>}>
            Your card has insufficient funds.
          </FailureState>
          <FailureState autoFocus={false} tone="cancelled" />
        </div>
        <TrustStrip>
          Mount provider-owned collection and show the verified payment outcome.
        </TrustStrip>
      </Row>

      <Row title="Action frames">
        <ActionFrame variant="content">
          <div className="p-6 text-center text-muted">content: sizes itself</div>
        </ActionFrame>
        <Section title="Inline" description="Where a hosted field or a QR code is drawn.">
          <ActionFrame variant="inline">
            <div className="grid h-full place-items-center text-muted">inline</div>
          </ActionFrame>
        </Section>
        <Divider>or</Divider>
      </Row>
    </>
  )
}
