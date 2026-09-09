import { createBranded, type PaymentInstrument } from '@checkout-kit/core'
import { PaymentActionHost, useCheckout } from '@checkout-kit/react'

const providers = [
  ['psp', 'PSP / card processor'],
  ['acquiring', 'Acquiring bank'],
  ['hpp', 'Hosted payment page'],
  ['hostedfields', 'Hosted fields'],
  ['wallet', 'Wallet SDK'],
  ['transfer', 'Bank transfer / QR'],
  ['stripe', 'Stripe adapter'],
  ['adyen', 'Adyen adapter'],
  ['paypal', 'PayPal adapter'],
] as const

const realProvidersEnabled = Boolean(import.meta.env.VITE_REAL_PROVIDER_API_BASE_URL)

const card: PaymentInstrument = {
  kind: 'card',
  number: createBranded('4242424242424242'),
  exp: createBranded('12/30'),
  cvc: createBranded('123'),
  holder: 'Mock Shopper',
}

const instrumentFor = (providerId: string): PaymentInstrument => {
  switch (providerId) {
    case 'psp':
    case 'acquiring':
    case 'stripe':
    case 'adyen':
      return card
    case 'hostedfields':
      return { kind: 'hosted_session', sessionId: 'mock-fields-session' }
    case 'wallet':
    case 'hpp':
    case 'transfer':
      return { kind: 'none' }
    default:
      return { kind: 'none' }
  }
}

export const App = () => {
  const { engine, providerId, phase, action, error, intent, isBusy } = useCheckout()

  const pay = async (id: string) => {
    await engine.useProvider(id)
    await engine.pay({ input: { planId: 'starter' }, instrument: instrumentFor(id) })
  }

  return (
    <main>
      <h1>Checkout Kit mock React example</h1>
      <p>
        One React checkout, six mock protocols, plus optional real Stripe, Adyen and PayPal
        adapters.
      </p>
      <nav aria-label="Payment providers">
        {providers.map(([id, label]) => (
          <button
            key={id}
            disabled={
              isBusy || (['stripe', 'adyen', 'paypal'].includes(id) && !realProvidersEnabled)
            }
            onClick={() => void pay(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {!realProvidersEnabled ? (
        <p>
          Stripe, Adyen and PayPal need your backend. Set VITE_REAL_PROVIDER_API_BASE_URL to enable
          their real adapters.
        </p>
      ) : null}
      <dl>
        <dt>Provider</dt>
        <dd>{providerId ?? 'none'}</dd>
        <dt>Phase</dt>
        <dd>{phase}</dd>
        <dt>Intent</dt>
        <dd>{intent?.id ?? 'none'}</dd>
      </dl>
      {error ? <p role="alert">{error.message}</p> : null}
      {action ? <pre>{JSON.stringify(action, null, 2)}</pre> : null}
      <PaymentActionHost className="payment-action" onSettled={(result) => console.log(result)} />
    </main>
  )
}
