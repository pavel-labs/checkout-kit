import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { CheckoutAPI, Client as AdyenClient, EnvironmentEnum } from '@adyen/api-library'
import {
  CheckoutPaymentIntent,
  Client as PayPalClient,
  Environment as PayPalEnvironment,
  OrdersController,
} from '@paypal/paypal-server-sdk'
import Stripe from 'stripe'

const port = Number(process.env.PORT ?? 4000)
const returnUrl = process.env.CHECKOUT_RETURN_URL ?? 'http://localhost:5173/payment/return'
const plans = {
  starter: { amount: 1999, currency: 'usd' as const },
  team: { amount: 9900, currency: 'usd' as const },
}

type PlanId = keyof typeof plans
type AdyenRecord = {
  id: string
  amount: number
  currency: string
  resultCode: string
  action: Record<string, unknown> | null
  pspReference?: string
  refusalReason?: string
  refusalReasonCode?: string
}
type PayPalRecord = { id: string; amount: number; currency: string; status: string; approveUrl?: string }

const adyenRecords = new Map<string, AdyenRecord>()
const paypalRecords = new Map<string, PayPalRecord>()

let stripe: Stripe | undefined
let adyen: CheckoutAPI | undefined
let paypal: OrdersController | undefined

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required.`)
  return value
}

const getStripe = (): Stripe => {
  stripe ??= new Stripe(required('STRIPE_SECRET_KEY'))
  return stripe
}

const getAdyen = (): CheckoutAPI => {
  adyen ??= new CheckoutAPI(
    new AdyenClient({ apiKey: required('ADYEN_API_KEY'), environment: EnvironmentEnum.TEST }),
  )
  return adyen
}

const getPayPal = (): OrdersController => {
  paypal ??= new OrdersController(
    new PayPalClient({
      clientCredentialsAuthCredentials: {
        oAuthClientId: required('PAYPAL_CLIENT_ID'),
        oAuthClientSecret: required('PAYPAL_CLIENT_SECRET'),
      },
      environment: PayPalEnvironment.Sandbox,
    }),
  )
  return paypal
}

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': process.env.CHECKOUT_ORIGIN ?? 'http://localhost:5173',
    'access-control-allow-headers': 'content-type, idempotency-key',
  })
  res.end(JSON.stringify(body))
}

const readJson = async (req: IncomingMessage): Promise<Record<string, any>> => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

const plan = (planId: unknown) => {
  if (typeof planId !== 'string' || !(planId in plans)) throw new Error(`Unknown plan: ${String(planId)}`)
  return plans[planId as PlanId]
}

const stripeDto = (intent: Stripe.PaymentIntent) => ({
  id: intent.id,
  amount: intent.amount,
  currency: intent.currency,
  status: intent.status,
  next_action: intent.next_action,
  last_payment_error: intent.last_payment_error,
})

const adyenDto = (record: AdyenRecord) => ({
  id: record.id,
  amount: record.amount,
  currency: record.currency,
  resultCode: record.resultCode,
  action: record.action,
  refusalReason: record.refusalReason,
  refusalReasonCode: record.refusalReasonCode,
})

const paypalDto = (record: PayPalRecord) => ({
  id: record.id,
  amount: record.amount,
  currency: record.currency,
  status: record.status,
  approveUrl: record.approveUrl,
})

const handleStripe = async (req: IncomingMessage, res: ServerResponse, path: string) => {
  const match = path.match(/^\/stripe\/payments\/([^/]+)(?:\/(confirm|cancel))?$/)
  if (req.method === 'POST' && path === '/stripe/payments') {
    const body = await readJson(req)
    const selectedPlan = plan(body.planId)
    return json(
      res,
      200,
      stripeDto(
        await getStripe().paymentIntents.create(
          {
            amount: selectedPlan.amount,
            currency: selectedPlan.currency,
            payment_method_types: ['card'],
            metadata: { planId: body.planId },
          },
          { idempotencyKey: req.headers['idempotency-key'] as string | undefined },
        ),
      ),
    )
  }
  if (!match) return false
  const intentId = match[1]
  if (req.method === 'GET' && !match[2]) return json(res, 200, stripeDto(await getStripe().paymentIntents.retrieve(intentId)))
  if (req.method !== 'POST') return false
  if (match[2] === 'cancel') return json(res, 200, stripeDto(await getStripe().paymentIntents.cancel(intentId)))
  const body = await readJson(req)
  const card = body.card
  const paymentMethod = (body.paymentMethodId
    ? { payment_method: body.paymentMethodId }
    : {
        payment_method_data: {
          type: 'card' as const,
          card: {
            number: card.number,
            exp_month: Number(card.exp.slice(0, 2)),
            exp_year: Number(`20${card.exp.slice(-2)}`),
            cvc: card.cvc,
          },
        },
      }) as Stripe.PaymentIntentConfirmParams
  return json(
    res,
    200,
    stripeDto(
      await getStripe().paymentIntents.confirm(intentId, {
        ...paymentMethod,
        return_url: returnUrl,
      }, { idempotencyKey: req.headers['idempotency-key'] as string | undefined }),
    ),
  )
}

const handleAdyen = async (req: IncomingMessage, res: ServerResponse, path: string) => {
  const detailsMatch = path.match(/^\/adyen\/payments\/([^/]+)\/details$/)
  const actionMatch = path.match(/^\/adyen\/payments\/([^/]+)$/)
  if (req.method === 'POST' && path === '/adyen/payments/sessions') {
    const body = await readJson(req)
    const selectedPlan = plan(body.planId)
    const record: AdyenRecord = {
      id: randomUUID(),
      amount: selectedPlan.amount,
      currency: selectedPlan.currency.toUpperCase(),
      resultCode: 'Pending',
      action: null,
    }
    adyenRecords.set(record.id, record)
    return json(res, 200, adyenDto(record))
  }
  if (req.method === 'GET' && actionMatch) {
    const record = adyenRecords.get(actionMatch[1])
    return record ? json(res, 200, adyenDto(record)) : json(res, 404, { message: 'Payment not found.' })
  }
  if (req.method === 'POST' && detailsMatch) {
    const record = adyenRecords.get(detailsMatch[1])
    if (!record) return json(res, 404, { message: 'Payment not found.' })
    const body = await readJson(req)
    const response = await getAdyen().PaymentsApi.paymentsDetails({ details: body.details })
    Object.assign(record, { resultCode: response.resultCode, action: response.action ?? null })
    return json(res, 200, adyenDto(record))
  }
  if (!actionMatch || req.method !== 'POST') return false
  const record = adyenRecords.get(actionMatch[1])
  if (!record) return json(res, 404, { message: 'Payment not found.' })
  if (path.endsWith('/cancel')) {
    record.resultCode = 'Cancelled'
    return json(res, 200, adyenDto(record))
  }
  const body = await readJson(req)
  const response = await getAdyen().PaymentsApi.payments(
    {
      amount: { currency: record.currency, value: record.amount },
      merchantAccount: required('ADYEN_MERCHANT_ACCOUNT'),
      paymentMethod: body.paymentMethod,
      reference: record.id,
      returnUrl,
    },
    { headers: { 'Idempotency-Key': req.headers['idempotency-key'] as string | undefined } },
  )
  Object.assign(record, {
    resultCode: response.resultCode,
    action: response.action ?? null,
    pspReference: response.pspReference,
    refusalReason: response.refusalReason,
    refusalReasonCode: response.refusalReasonCode,
  })
  return json(res, 200, adyenDto(record))
}

const handlePayPal = async (req: IncomingMessage, res: ServerResponse, path: string) => {
  const match = path.match(/^\/paypal\/orders\/([^/]+)(?:\/(capture|cancel))?$/)
  if (req.method === 'POST' && path === '/paypal/orders') {
    const body = await readJson(req)
    const selectedPlan = plan(body.planId)
    const response = await getPayPal().createOrder({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [{ amount: { currencyCode: selectedPlan.currency.toUpperCase(), value: (selectedPlan.amount / 100).toFixed(2) } }],
        applicationContext: { returnUrl, cancelUrl: returnUrl },
      },
      paypalRequestId: req.headers['idempotency-key'] as string | undefined,
      prefer: 'return=representation',
    })
    const order = response.result
    if (!order?.id) throw new Error('PayPal did not return an order id.')
    const record: PayPalRecord = {
      id: order.id,
      amount: selectedPlan.amount,
      currency: selectedPlan.currency.toUpperCase(),
      status: order.status ?? 'CREATED',
      approveUrl: order.links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href,
    }
    paypalRecords.set(record.id, record)
    return json(res, 200, paypalDto(record))
  }
  if (!match) return false
  const record = paypalRecords.get(match[1])
  if (!record) return json(res, 404, { message: 'Order not found.' })
  if (req.method === 'GET' && !match[2]) {
    const response = await getPayPal().getOrder({ id: record.id })
    record.status = response.result?.status ?? record.status
    return json(res, 200, paypalDto(record))
  }
  if (req.method !== 'POST') return false
  if (match[2] === 'cancel') {
    record.status = 'VOIDED'
    return json(res, 200, paypalDto(record))
  }
  const response = await getPayPal().captureOrder({
    id: record.id,
    paypalRequestId: req.headers['idempotency-key'] as string | undefined,
    prefer: 'return=representation',
  })
  record.status = response.result?.status ?? 'COMPLETED'
  return json(res, 200, paypalDto(record))
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  const path = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname
  try {
    const handled =
      (await handleStripe(req, res, path)) ||
      (await handleAdyen(req, res, path)) ||
      (await handlePayPal(req, res, path))
    if (!handled && !res.writableEnded) json(res, 404, { message: 'Route not found.' })
  } catch (cause) {
    if (!res.writableEnded) json(res, 500, { message: cause instanceof Error ? cause.message : 'Payment request failed.' })
  }
})

server.listen(port, () => console.log(`Payment API listening on http://localhost:${port}`))