import { useRef, useState } from 'react'
import {
  Button,
  CardFields,
  CardFieldsRow,
  CardNumberInput,
  Checkbox,
  CvcInput,
  DetailItem,
  DetailList,
  Disclosure,
  ExpiryInput,
  FailureState,
  Field,
  IconButton,
  Input,
  InputGroup,
  Money,
  NEW_INSTRUMENT_ID,
  OrderSummary,
  PaymentButton,
  PaymentMethodSelector,
  PaymentStatus,
  ProcessingState,
  Receipt,
  SavedInstrumentList,
  Section,
  SuccessState,
  TrustStrip,
} from '@checkout-kit/ui'
import { GalleryIcon } from './icons'

export type PreviewScreen = 'ready' | 'processing' | 'success' | 'failure'

/** An explicitly labelled UI preview. It never calls the engine or a payment provider. */
export function CheckoutPreview({
  screen,
  onScreenChange,
}: {
  screen: PreviewScreen
  onScreenChange: (screen: PreviewScreen) => void
}) {
  const [email, setEmail] = useState('alex@example.com')
  const emailRef = useRef<HTMLInputElement>(null)
  const [method, setMethod] = useState('card')
  const [saved, setSaved] = useState<string | null>('example-card')
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [remember, setRemember] = useState(false)

  return (
    <div className="preview-checkout">
      <aside className="preview-order" aria-label="Example order">
        <div className="preview-store">
          <span className="preview-store__mark" aria-hidden="true">
            s.
          </span>
          <span>Studio</span>
          <span className="preview-store__tag">Example store</span>
        </div>
        <div className="preview-order__intro">
          <span className="preview-eyebrow">Your next great idea starts here</span>
          <h2>Studio Plus</h2>
          <p>A little more room to create, together.</p>
        </div>
        <div className="preview-price">
          <Money amount={2500} currency="USD" locale="en-US" />
          <span>USD / month</span>
        </div>
        <ul className="preview-benefits">
          {['Unlimited projects', 'Shared team workspace', 'Priority support'].map((benefit) => (
            <li key={benefit}>
              <GalleryIcon name="check" />
              {benefit}
            </li>
          ))}
        </ul>
        <OrderSummary
          panel={false}
          currency="USD"
          locale="en-US"
          adjustments={[
            { id: 'subtotal', name: 'Monthly subscription', amount: 2500 },
            { id: 'tax', name: 'Tax', amount: 0 },
          ]}
          total={{ id: 'total', name: 'Due today', amount: 2500 }}
        />
        <p className="preview-order__note">
          Example pricing. This preview does not create a subscription.
        </p>
      </aside>

      <section className="preview-payment" aria-label="Checkout preview">
        {screen === 'ready' ? (
          <form
            className="ck-form"
            onSubmit={(event) => {
              event.preventDefault()
              onScreenChange('processing')
            }}
          >
            <Section title="Payment details" description="Choose how you'd like to pay.">
              <Field label="Email address" required>
                {(control) => (
                  <InputGroup
                    leading={<GalleryIcon name="mail" />}
                    trailing={
                      email ? (
                        <IconButton
                          label="Clear email address"
                          onClick={() => {
                            setEmail('')
                            emailRef.current?.focus()
                          }}
                        >
                          <GalleryIcon name="close" />
                        </IconButton>
                      ) : undefined
                    }
                  >
                    <Input
                      {...control}
                      ref={emailRef}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                    />
                  </InputGroup>
                )}
              </Field>
            </Section>
            <PaymentMethodSelector
              layout="tabs"
              label="Preview payment method"
              methods={[
                { id: 'card', label: 'Card', icon: <GalleryIcon name="card" /> },
                { id: 'bank', label: 'Bank transfer', icon: <GalleryIcon name="bank" /> },
              ]}
              value={method}
              onChange={setMethod}
            />
            {method === 'card' ? (
              <>
                <SavedInstrumentList
                  instruments={[
                    {
                      id: 'example-card',
                      brand: 'visa',
                      last4: '4242',
                      expiry: '12/30',
                      icon: <GalleryIcon name="card" />,
                    },
                  ]}
                  labels={{ legend: 'Your card', useAnother: 'Use a different card' }}
                  value={saved}
                  onChange={setSaved}
                />
                {saved === NEW_INSTRUMENT_ID ? (
                  <CardFields>
                    <Field label="Example card number" required>
                      {(control) => (
                        <CardNumberInput {...control} value={number} onChange={setNumber} />
                      )}
                    </Field>
                    <CardFieldsRow>
                      <Field label="Expiry" required>
                        {(control) => (
                          <ExpiryInput {...control} value={expiry} onChange={setExpiry} />
                        )}
                      </Field>
                      <Field label="Security code" required>
                        {(control) => <CvcInput {...control} value={cvc} onChange={setCvc} />}
                      </Field>
                    </CardFieldsRow>
                    <p className="ck-field__hint">
                      Use example details only. These fields are not connected to a provider.
                    </p>
                  </CardFields>
                ) : null}
                <Checkbox
                  label="Remember this card"
                  description="Example preference for your next visit."
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
              </>
            ) : (
              <div className="preview-bank">
                <span className="preview-bank__icon">
                  <GalleryIcon name="bank" />
                </span>
                <h3>Pay from your bank</h3>
                <p>
                  Continue to see the confirmation screen. This is a UI preview; no bank connection
                  opens.
                </p>
              </div>
            )}
            <div className="ck-form__actions">
              <PaymentButton state="idle" amount="$25.00" rightIcon={<GalleryIcon name="arrow" />}>
                {method === 'card' ? 'Pay' : 'Continue'}
              </PaymentButton>
              <TrustStrip icon={<GalleryIcon name="lock" />}>
                Preview only · No money is charged
              </TrustStrip>
            </div>
            <Disclosure summary="What happens after payment?">
              A real checkout shows the provider's confirmed outcome. Here you can explore each
              screen using Preview state.
            </Disclosure>
          </form>
        ) : (
          <div className="preview-result">
            {screen === 'processing' ? (
              <>
                <ProcessingState
                  actions={
                    <Button variant="secondary" onClick={() => onScreenChange('success')}>
                      Preview success
                    </Button>
                  }
                >
                  We're checking the payment outcome.
                </ProcessingState>
                <PaymentStatus state="processing" />
              </>
            ) : screen === 'success' ? (
              <SuccessState
                details={
                  <Receipt>
                    <DetailList>
                      <DetailItem
                        name="Amount"
                        value={<Money amount={2500} currency="USD" locale="en-US" />}
                        total
                      />
                      <DetailItem name="Plan" value="Studio Plus" />
                      <DetailItem name="Receipt" value={email || 'alex@example.com'} />
                    </DetailList>
                  </Receipt>
                }
                actions={<Button onClick={() => onScreenChange('ready')}>Back to preview</Button>}
              >
                You're all set. Your workspace is ready.
              </SuccessState>
            ) : (
              <FailureState
                tone="declined"
                actions={
                  <Button onClick={() => onScreenChange('ready')}>
                    Choose another payment method
                  </Button>
                }
              >
                Your bank couldn't approve this payment. Try another card or contact your bank.
              </FailureState>
            )}
            <p className="preview-result__note">Example outcome · No payment has been made</p>
          </div>
        )}
      </section>
    </div>
  )
}
