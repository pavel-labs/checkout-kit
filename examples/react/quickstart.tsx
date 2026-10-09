import type { CheckoutEngine, PaymentResult } from '@checkout-kit/core'
import { CheckoutProvider, CheckoutRoot, PaymentActionHost, useCheckout } from '@checkout-kit/react'
import { Button, Money, Panel } from '@checkout-kit/ui'
import '@checkout-kit/ui/styles.css'

type Pay = (planId: string) => Promise<PaymentResult>

function Payment({ planId, pay }: { planId: string; pay: Pay }) {
  const { engine, phase, intent, error, isBusy, isLocked, isSettled } = useCheckout()
  const hasFinalOutcome = intent && ['succeeded', 'declined', 'canceled'].includes(intent.status)
  return (
    <Panel title="Checkout">
      {intent && <Money amount={intent.amount} currency={intent.currency} />}
      <p role="status">{phase}</p>
      {error && <p role="alert">{error.message}</p>}
      <Button busy={isBusy} disabled={isLocked} onClick={() => void pay(planId)}>
        Pay with PayPal
      </Button>
      {phase === 'failed' && (
        <Button variant="secondary" onClick={() => void pay(planId)}>
          Retry the same payment
        </Button>
      )}
      {isSettled && hasFinalOutcome && (
        <Button variant="secondary" onClick={() => engine.reset()}>
          Start over
        </Button>
      )}
      <PaymentActionHost />
    </Panel>
  )
}

export function PayPalCheckout({
  engine,
  planId,
  pay,
}: {
  engine: CheckoutEngine
  planId: string
  pay: Pay
}) {
  return (
    <CheckoutProvider engine={engine}>
      <CheckoutRoot theme="auto">
        <Payment planId={planId} pay={pay} />
      </CheckoutRoot>
    </CheckoutProvider>
  )
}
