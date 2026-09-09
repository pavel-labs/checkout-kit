import { useState, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CheckoutRoot } from '@checkout-kit/react'
import type { Platform } from '@checkout-kit/runtime-browser'
import type { PaymentUiState } from '@checkout-kit/core'
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
  Input,
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

// Every component in the kit, on one page, at whatever width the window is - and under
// whichever theme, platform and density you point the controls at.
//
// This is deliberately a route in the demo rather than a Storybook: the kit's whole claim is
// that it is plain React and plain CSS with no build step of its own, and a component
// workshop that needed a bundler of its own would undercut it. It ships with the deployed
// demo, so the kit can be looked at without cloning anything.

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

const ACCENTS = ['#aa3bff', '#0ea5e9', '#10b981', '#f97316', '#e11d48'] as const

const Row = ({ title, note, children }: { title: string; note?: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3 border-t border-border-subtle pt-6">
    <div className="flex flex-col gap-1">
      <h2 className="text-sm tracking-wide text-subtle uppercase">{title}</h2>
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </div>
    {children}
  </section>
)

/** The gallery's own chrome, deliberately not built from the kit it is inspecting. */
const Control = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex flex-col gap-1 text-xs text-subtle uppercase">
    {label}
    {children}
  </label>
)

const SELECT_CLASS =
  'rounded border border-border-subtle bg-transparent px-2 py-1 text-sm text-inherit normal-case'

function GalleryPage() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>('dark')
  const [platform, setPlatform] = useState<Platform | 'auto'>('auto')
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [accent, setAccent] = useState<string>(ACCENTS[0])

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">The UI kit</h1>
          <p className="text-sm text-muted">
            Every component, under the theme, platform and density you pick. The accent is a single
            custom property - move it and the hover, pressed, subtle and focus tones move with it.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <Control label="Theme">
            <select
              className={SELECT_CLASS}
              value={theme}
              onChange={(event) => setTheme(event.target.value as typeof theme)}
            >
              <option value="dark">dark</option>
              <option value="light">light</option>
              <option value="auto">auto</option>
            </select>
          </Control>

          <Control label="Platform">
            <select
              className={SELECT_CLASS}
              value={platform}
              onChange={(event) => setPlatform(event.target.value as typeof platform)}
            >
              <option value="auto">auto</option>
              <option value="ios">ios</option>
              <option value="android">android</option>
              <option value="desktop">desktop</option>
            </select>
          </Control>

          <Control label="Density">
            <select
              className={SELECT_CLASS}
              value={density}
              onChange={(event) => setDensity(event.target.value as typeof density)}
            >
              <option value="comfortable">comfortable</option>
              <option value="compact">compact</option>
            </select>
          </Control>

          <Control label="Accent">
            <span className="flex gap-2">
              {ACCENTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={value}
                  aria-pressed={accent === value}
                  onClick={() => setAccent(value)}
                  style={{ background: value }}
                  className={`size-6 rounded-full ${
                    accent === value ? 'ring-2 ring-current ring-offset-2' : ''
                  }`}
                />
              ))}
            </span>
          </Control>
        </div>
      </header>

      {/* A nested root: the kit's tokens are all declared on .ck-root, so an inner one
          re-declares them for its subtree and the page around it is untouched. */}
      <CheckoutRoot
        theme={theme}
        platform={platform}
        density={density}
        style={appearanceToStyle({ accent })}
        className="flex flex-col gap-8 rounded-lg p-4"
      >
        <Specimens />
      </CheckoutRoot>
    </div>
  )
}

function Specimens() {
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
      <Row title="Payment states" note="The one live region on the page.">
        <div className="flex flex-col gap-2">
          {STATES.map((state) => (
            <div key={state} className="flex items-center gap-3">
              <code className="w-36 text-sm text-muted">{state}</code>
              <PaymentStatus state={state} />
            </div>
          ))}
        </div>
      </Row>

      <Row title="Buttons">
        <PaymentButton state="idle" amount="$25.00">
          Pay
        </PaymentButton>
        <PaymentButton state="submitting">Continue payment</PaymentButton>
        <PaymentButton state="idle" disabled>
          Continue payment
        </PaymentButton>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
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

      <Row title="Form controls" note="Every one of these goes through Field.">
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
          description="Stored by your payment provider, never by the merchant."
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
        <OptionCardGroup label="Plan" value="monthly" onChange={() => {}}>
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

      <Row title="Express checkout" note="Layout only: every wallet mandates its own button.">
        <ExpressCheckout layout="row">
          <Button variant="ghost">Apple Pay</Button>
          <Button variant="ghost">Google Pay</Button>
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
          description="A real <dialog>, so the focus trap and Escape are the browser's."
          footer={<Button onClick={() => setDialog(false)}>Got it</Button>}
        >
          Your bank checks it against the address it has on file for the card.
        </Dialog>
      </Row>

      <Row title="Screens">
        <ProcessingState />
        <AuthenticationState variant="inline" actions={<Button variant="ghost">Cancel</Button>}>
          <div className="grid h-full place-items-center text-muted">the provider draws here</div>
        </AuthenticationState>
        <SuccessState
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
        <FailureState tone="declined" actions={<Button>Try again</Button>}>
          Your card has insufficient funds.
        </FailureState>
        <FailureState tone="cancelled" />
        <TrustStrip>
          Payments are processed by your provider. The merchant never sees your card.
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
