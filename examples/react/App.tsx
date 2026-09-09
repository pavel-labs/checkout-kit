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

// One checkout, nine integrations behind it. Everything provider-specific lives in the
// plugin; this file only ever asks "did the provider want an action, and where does it go?"
//
// Deliberately plain React: no form library, no validation schema, no router. The demo in
// apps/ has all three. This is here to show what the kit alone is worth.

// The mock backend's own catalogue - see packages/testing/src/backend/data.ts. Amounts are
// minor units everywhere in the kit, so 2500 is $25.00.
const PLAN = { id: '1id', name: 'Monthly plan', amount: 2500, currency: 'USD' }

const REAL_PROVIDERS = ['stripe', 'adyen', 'paypal']
const realProvidersEnabled = Boolean(import.meta.env.VITE_REAL_PROVIDER_API_BASE_URL)

const PROVIDERS = [
  { id: 'psp', label: 'PSP / card processor', description: 'JSON API, 3-D Secure 2 in a frame' },
  { id: 'acquiring', label: 'Acquiring bank', description: 'form-urlencoded, 3-D Secure 1' },
  { id: 'hpp', label: 'Hosted payment page', description: 'The shopper pays on the bank site' },
  { id: 'hostedfields', label: 'Hosted fields', description: 'The provider draws the inputs' },
  { id: 'wallet', label: 'Wallet SDK', description: 'A third-party sheet' },
  { id: 'transfer', label: 'Bank transfer', description: 'A QR code, paid in a banking app' },
  { id: 'stripe', label: 'Stripe adapter', description: 'Real API - needs your backend' },
  { id: 'adyen', label: 'Adyen adapter', description: 'Real API - needs your backend' },
  { id: 'paypal', label: 'PayPal adapter', description: 'Real API - needs your backend' },
].map((provider) => ({
  ...provider,
  disabled: REAL_PROVIDERS.includes(provider.id) && !realProvidersEnabled,
}))

/** Which providers want a card typed in, and which collect it somewhere else entirely. */
const NEEDS_CARD = ['psp', 'acquiring', 'stripe', 'adyen']

const instrumentFor = (
  providerId: string,
  card: { number: string; exp: string; cvc: string; holder: string },
): PaymentInstrument => {
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

  // One key per attempt, so a submit that slips past every guard is a no-op at the provider
  // rather than a second charge.
  const idempotencyKey = useRef(crypto.randomUUID())

  // A full-page redirect destroys this tab. Coming back, the pending payment is read out of
  // session storage and resumed from the parameters the provider put on the return URL -
  // without this, `hpp` and `paypal` can start a payment but never finish one.
  useEffect(() => {
    if (window.location.pathname !== RETURN_PATH) return

    void engine.hydrate(runtime.readReturnParams()).then(() => {
      window.history.replaceState(null, '', '/')
    })
  }, [engine])

  const settle = (result: PaymentResult) => {
    // The last key is spent; a retry is a new attempt.
    if (result.status !== 'succeeded') idempotencyKey.current = crypto.randomUUID()
  }

  const pay = async () => {
    await engine.useProvider(method)

    const result = await engine.pay({
      input: { planId: PLAN.id },
      instrument: instrumentFor(method, { number, exp, cvc, holder }),
      idempotencyKey: idempotencyKey.current,
    })

    if (result.status === 'requires_action') {
      // `inline` draws below, in the form. Everything else - a redirect that takes the tab,
      // a wallet sheet the SDK owns - runs with nothing of ours on screen.
      if (result.action.surface !== 'inline') settle(await engine.runPendingAction())
      return
    }

    settle(result)
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
            <Button variant="secondary" onClick={() => engine.reset()}>
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
    return (
      <CheckoutLayout>
        <FailureState
          tone={phase === 'canceled' ? 'cancelled' : phase === 'declined' ? 'declined' : 'failed'}
          actions={<Button onClick={() => engine.reset()}>Try again</Button>}
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
          <ErrorText>{error?.message}</ErrorText>
          <PaymentButton
            state={state}
            disabled={isLocked}
            amount={formatMoney({ amount: PLAN.amount, currency: PLAN.currency })}
          >
            Pay
          </PaymentButton>
          <TrustStrip>This is a mock backend. No card is charged and none is stored.</TrustStrip>
        </StickyActions>
      }
    >
      <Section title="How would you like to pay?">
        <PaymentMethodSelector methods={PROVIDERS} value={method} onChange={setMethod} />
        {!realProvidersEnabled ? (
          <p className="note">
            Stripe, Adyen and PayPal talk to a real sandbox. Run <code>npm run dev:server</code> and
            set <code>VITE_REAL_PROVIDER_API_BASE_URL</code> to enable them.
          </p>
        ) : null}
      </Section>

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
