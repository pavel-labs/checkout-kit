import { useEffect, useRef, useState } from 'react'
import {
  createBranded,
  formatMoney,
  type PaymentInstrument,
  type PaymentResult,
} from '@checkout-kit/core'
import { PaymentActionHost, useCheckout, usePaymentState } from '@checkout-kit/react'
import {
  ActionFrame,
  AuthenticationState,
  Button,
  CardFields,
  CardholderInput,
  CardNumberInput,
  CheckoutForm,
  CheckoutLayout,
  CvcInput,
  DetailItem,
  DetailList,
  ErrorText,
  ExpiryInput,
  FailureState,
  Field,
  Input,
  Money,
  OrderSummary,
  PaymentButton,
  PaymentMethodSelector,
  PaymentStatus,
  ProcessingState,
  Receipt,
  Section,
  StickyActions,
  SuccessState,
  TrustStrip,
} from '@checkout-kit/ui'
import { RETURN_PATH, runtime } from './mock-checkout'
import { StripeFields, type TokenizeCard } from './StripeFields'
import { AdyenFields, type ReadAdyenCard } from './AdyenFields'
import { adyenFieldsEnabled, stripeElementsEnabled } from './provider-sdks'

// One checkout, nine integrations behind it. This file only ever asks: did the provider want
// an action, and where does it go?
//
// Plain React on purpose - no form library, no schema, no router. The demo in apps/ has all
// three; this shows what the kit alone is worth.

// From the mock backend's catalogue (packages/testing/src/backend/data.ts). Minor units
// everywhere in the kit, so 2500 is $25.00.
const PLAN = { id: '1id', name: 'Monthly plan', amount: 2500, currency: 'USD' }

const REAL_PROVIDERS = ['stripe', 'adyen', 'paypal']
const realProvidersEnabled = Boolean(import.meta.env.VITE_REAL_PROVIDER_API_BASE_URL)
const simulation = import.meta.env.VITE_PROTOCOL_SIMULATION === '1'

const PROVIDERS = [
  { id: 'psp', label: 'PSP / card processor', description: 'JSON API, 3-D Secure 2 in a frame' },
  { id: 'acquiring', label: 'Acquiring bank', description: 'form-urlencoded, 3-D Secure 1' },
  { id: 'hpp', label: 'Hosted payment page', description: 'The shopper pays on the bank site' },
  { id: 'hostedfields', label: 'Hosted fields', description: 'The provider draws the inputs' },
  { id: 'wallet', label: 'Wallet SDK', description: 'A third-party sheet' },
  { id: 'transfer', label: 'Bank transfer', description: 'A QR code, paid in a banking app' },
  {
    id: 'stripe',
    label: 'Stripe adapter',
    description: simulation ? 'Local protocol simulator' : 'Merchant API + Stripe.js',
  },
  {
    id: 'adyen',
    label: 'Adyen adapter',
    description: simulation ? 'Local protocol simulator' : 'Merchant API + a stored method',
  },
  {
    id: 'paypal',
    label: 'PayPal adapter',
    description: simulation ? 'Local protocol simulator' : 'Merchant API + approval page',
  },
].map((provider) => ({
  ...provider,
  disabled: REAL_PROVIDERS.includes(provider.id) && !realProvidersEnabled,
}))

/** Which providers want a card typed in, and which collect it somewhere else entirely. */
const NEEDS_CARD = ['psp', 'acquiring']

const instrumentFor = (
  providerId: string,
  card: { number: string; exp: string; cvc: string; holder: string },
  token: string,
): PaymentInstrument => {
  if (providerId === 'stripe' || providerId === 'adyen') return { kind: 'token', token }
  if (NEEDS_CARD.includes(providerId)) {
    return {
      kind: 'card',
      number: createBranded(card.number),
      exp: createBranded(card.exp),
      cvc: createBranded(card.cvc),
      holder: card.holder,
    }
  }

  if (providerId === 'hostedfields')
    return { kind: 'hosted_session', sessionId: 'mock-fields-session' }

  // Not a missing instrument - it is what a hosted page, a wallet and a transfer expect.
  return { kind: 'none' }
}

export const App = () => {
  const { engine, providerId, phase, action, error, intent, isLocked } = useCheckout()
  const state = usePaymentState()

  const [method, setMethod] = useState('psp')
  const [number, setNumber] = useState('4242424242424242')
  const [exp, setExp] = useState('12/30')
  const [cvc, setCvc] = useState('123')
  const [holder, setHolder] = useState('Mock Shopper')
  const [token, setToken] = useState(simulation ? 'pm_mock_approve' : 'pm_card_visa')
  const [submissionError, setSubmissionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const tokenization = useRef<TokenizeCard | null>(null)
  const readAdyen = useRef<ReadAdyenCard | null>(null)
  const inSubmit = useRef(false)
  const returnStarted = useRef(false)

  // One key per attempt: a submit that slips past every guard is then a no-op, not a
  // second charge.
  const idempotencyKey = useRef(crypto.randomUUID())

  // A full-page redirect destroys this tab. Coming back, the pending payment is read from
  // session storage and resumed. Without this, `hpp` and `paypal` never finish.
  useEffect(() => {
    if (window.location.pathname !== RETURN_PATH || returnStarted.current) return
    returnStarted.current = true

    void engine.hydrate(runtime.readReturnParams()).then((result) => {
      if (result && (result.status !== 'error' || result.intent?.status === 'canceled'))
        window.history.replaceState(null, '', '/')
    })
  }, [engine])

  const settle = (result: PaymentResult) => {
    // The last key is spent; a retry is a new attempt.
    if (
      result.status === 'declined' ||
      (result.status === 'error' && result.intent?.status === 'canceled')
    )
      idempotencyKey.current = crypto.randomUUID()
  }

  const pay = async () => {
    if (inSubmit.current || isLocked) return
    inSubmit.current = true
    setSubmitting(true)
    setSubmissionError('')
    try {
      await engine.useProvider(method)
      let paymentToken = token
      if (method === 'stripe' && stripeElementsEnabled && intent?.status !== 'processing') {
        if (!tokenization.current) throw new Error('Wait for Stripe card fields to load.')
        paymentToken = await tokenization.current()
      }

      let instrument = instrumentFor(method, { number, exp, cvc, holder }, paymentToken)
      if (method === 'adyen' && adyenFieldsEnabled && intent?.status !== 'processing') {
        if (!readAdyen.current) throw new Error('Wait for Adyen card fields to load.')
        instrument = readAdyen.current()
      }
      const result = await engine.pay({
        input: { planId: PLAN.id },
        instrument,
        idempotencyKey: idempotencyKey.current,
      })

      if (result.status === 'requires_action') {
        // `inline` draws below, in the form. Everything else runs with nothing of ours
        // on screen.
        if (result.action.surface !== 'inline') settle(await engine.runPendingAction())
        return
      }

      settle(result)
    } catch (cause) {
      setSubmissionError(
        cause instanceof Error ? cause.message : 'The payment could not be started.',
      )
    } finally {
      inSubmit.current = false
      setSubmitting(false)
    }
  }
  const resetAttempt = () => {
    idempotencyKey.current = crypto.randomUUID()
    engine.reset()
  }
  const retry = async () => {
    if (window.location.pathname === RETURN_PATH) {
      const result = await engine.hydrate(runtime.readReturnParams())
      if (result && result.status !== 'error') window.history.replaceState(null, '', '/')
    } else {
      await pay()
    }
  }

  if (phase === 'succeeded') {
    return (
      <CheckoutLayout>
        <SuccessState
          details={
            <Receipt>
              <DetailList>
                <DetailItem
                  name="Amount"
                  value={
                    <Money
                      amount={intent?.amount ?? PLAN.amount}
                      currency={intent?.currency ?? PLAN.currency}
                    />
                  }
                />
                <DetailItem name="Provider" value={providerId ?? '-'} />
                <DetailItem name="Payment" value={intent?.id ?? '-'} total />
              </DetailList>
            </Receipt>
          }
          actions={
            <Button variant="secondary" onClick={resetAttempt}>
              Start over
            </Button>
          }
        >
          Thank you. Your payment has gone through.
        </SuccessState>
      </CheckoutLayout>
    )
  }

  if (phase === 'declined' || phase === 'failed' || phase === 'canceled') {
    const freshAttempt =
      phase !== 'failed' ||
      (error?.code === 'not_approved' && intent?.status === 'requires_payment_method')
    return (
      <CheckoutLayout>
        <FailureState
          tone={phase === 'canceled' ? 'cancelled' : phase === 'declined' ? 'declined' : 'failed'}
          actions={
            <Button
              disabled={submitting || isLocked}
              onClick={() => {
                if (freshAttempt) resetAttempt()
                else void retry()
              }}
            >
              {freshAttempt ? 'Try again' : 'Check payment status / retry'}
            </Button>
          }
        >
          {/* The issuer's own words. Never translated: they are what the shopper repeats
            to their bank. */}
          {error?.message}
        </FailureState>
      </CheckoutLayout>
    )
  }

  if (phase === 'resuming' || phase === 'polling')
    return (
      <CheckoutLayout>
        <ProcessingState />
      </CheckoutLayout>
    )

  const form = (
    <CheckoutForm
      onSubmit={(event) => {
        event.preventDefault()
        void pay()
      }}
      actions={
        <StickyActions>
          {state === 'failure' ? null : <PaymentStatus state={state} />}
          <ErrorText>{submissionError || error?.message}</ErrorText>
          <PaymentButton
            state={state}
            disabled={isLocked || submitting}
            amount={formatMoney({ amount: PLAN.amount, currency: PLAN.currency })}
          >
            Pay
          </PaymentButton>
          <TrustStrip>
            {REAL_PROVIDERS.includes(method) && !simulation
              ? 'Provider sandbox. Use test payment details only.'
              : 'Local simulation. No payment provider is contacted.'}
          </TrustStrip>
        </StickyActions>
      }
    >
      <Section title="How would you like to pay?">
        <PaymentMethodSelector
          methods={PROVIDERS}
          value={method}
          onChange={(id) => {
            setMethod(id)
            setToken(simulation ? 'pm_mock_approve' : id === 'adyen' ? '' : 'pm_card_visa')
          }}
        />
        {!realProvidersEnabled ? (
          <p className="note">
            Run <code>npm run dev:integration</code> to try Stripe, Adyen and PayPal protocols
            against the local simulator. See examples/server for sandbox configuration.
          </p>
        ) : null}
      </Section>

      {method === 'stripe' && stripeElementsEnabled ? (
        <Section title="Stripe card details">
          <StripeFields tokenization={tokenization} />
        </Section>
      ) : method === 'adyen' && adyenFieldsEnabled ? (
        <Section title="Adyen card details">
          <AdyenFields readCard={readAdyen} />
        </Section>
      ) : method === 'stripe' || method === 'adyen' ? (
        <Section title="Provider payment method">
          <Field
            label="Payment token"
            hint={
              simulation
                ? 'pm_mock_approve, pm_mock_decline, pm_mock_challenge or pm_mock_processing'
                : method === 'stripe'
                  ? 'Test PaymentMethod id, or configure Stripe Elements.'
                  : 'An Adyen storedPaymentMethodId for this shopper.'
            }
            required
          >
            {(control) => (
              <Input
                {...control}
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            )}
          </Field>
        </Section>
      ) : null}

      {NEEDS_CARD.includes(method) ? (
        <Section title="Card details">
          <CardFields>
            <Field label="Card number" required>
              {(control) => <CardNumberInput {...control} value={number} onChange={setNumber} />}
            </Field>
            <Field label="Name on card" required>
              {(control) => (
                <CardholderInput
                  {...control}
                  value={holder}
                  onChange={(event) => setHolder(event.target.value)}
                />
              )}
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
        </Section>
      ) : null}

      {action?.surface === 'inline' ? (
        <Section title="One more step">
          <ActionFrame variant={action.kind === 'display' ? 'content' : 'inline'}>
            <PaymentActionHost onSettled={settle} className="ck-action-host" />
          </ActionFrame>
        </Section>
      ) : null}
    </CheckoutForm>
  )

  return (
    <CheckoutLayout
      aside={
        <OrderSummary
          currency={PLAN.currency}
          items={[
            { id: PLAN.id, name: PLAN.name, amount: PLAN.amount, description: 'Billed monthly' },
          ]}
          total={{ id: 'total', name: 'Total due', amount: PLAN.amount }}
        />
      }
    >
      {phase === 'action_pending' && action?.surface !== 'inline' ? (
        <AuthenticationState variant="challenge">
          <PaymentActionHost onSettled={settle} className="ck-action-host" />
        </AuthenticationState>
      ) : (
        form
      )}
    </CheckoutLayout>
  )
}
