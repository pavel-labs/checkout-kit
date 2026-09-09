import Stripe from 'stripe'

const plans = {
  starter: { amount: 1999, currency: 'usd' as const },
  team: { amount: 9900, currency: 'usd' as const },
}

let client: Stripe | undefined

const getStripe = (): Stripe => {
  if (!client) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is required on the server.')
    client = new Stripe(secretKey)
  }
  return client
}

export const createPaymentIntent = async (planId: keyof typeof plans, idempotencyKey: string) => {
  const plan = plans[planId]
  if (!plan) throw new Error(`Unknown plan: ${planId}`)

  const intent = await getStripe().paymentIntents.create(
    {
      amount: plan.amount,
      currency: plan.currency,
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey },
  )

  return {
    id: intent.id,
    amount: intent.amount,
    currency: intent.currency,
    status: intent.status,
    next_action: intent.next_action,
    last_payment_error: intent.last_payment_error,
  }
}
