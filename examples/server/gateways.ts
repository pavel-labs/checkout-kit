import { randomUUID } from 'node:crypto'
import Stripe from 'stripe'
import { CheckoutAPI, Client, EnvironmentEnum } from '@adyen/api-library'
import {
  CheckoutPaymentIntent,
  Client as PayPalClient,
  Environment,
  OrdersController,
  type Order,
} from '@paypal/paypal-server-sdk'
import type { StripePaymentIntent } from '@checkout-kit/provider-stripe'
import type { AdyenPayment } from '@checkout-kit/provider-adyen'
import type { PayPalOrder, PayPalCaptureStatus } from '@checkout-kit/provider-paypal'

export type Protocol = 'stripe' | 'adyen' | 'paypal'
export type PaymentDto = StripePaymentIntent | AdyenPayment | PayPalOrder
export interface MerchantPayment {
  readonly owner: string
  readonly protocol: Protocol
  readonly amount: number
  readonly currency: string
  readonly returnUrl: string
  dto: PaymentDto
  pspReference?: string
  webhookTime?: number
}
export interface NewPayment {
  readonly owner: string
  readonly amount: number
  readonly currency: string
  readonly returnUrl: string
}
export interface Gateway {
  create(input: NewPayment, key: string): Promise<PaymentDto>
  get(record: MerchantPayment): Promise<PaymentDto>
  confirm?(record: MerchantPayment, body: Record<string, unknown>, key: string): Promise<PaymentDto>
  details?(record: MerchantPayment, body: Record<string, unknown>, key: string): Promise<PaymentDto>
  cancel?(record: MerchantPayment, key: string): Promise<PaymentDto>
  approve?(record: MerchantPayment, accepted: boolean): Promise<PaymentDto>
}
export type Gateways = Partial<Record<Protocol, Gateway>>

/** Verify captures cover the merchant's entire USD order; the example only sells USD plans. */
export const captureStatus = (
  order: Order,
  amount: number,
  currency: string,
): PayPalCaptureStatus | undefined => {
  const captures = order.purchaseUnits?.flatMap((unit) => unit.payments?.captures ?? []) ?? []
  if (!captures.length) return undefined
  if (captures.some((capture) => capture.status === 'PENDING')) return 'PENDING'
  if (captures.some((capture) => capture.status !== 'COMPLETED')) return 'FAILED'
  let total = 0
  const seen = new Set<string>()
  for (const capture of captures) {
    if (!capture.id || seen.has(capture.id) || capture.amount?.currencyCode !== currency)
      return 'FAILED'
    seen.add(capture.id)
    const value = capture.amount.value
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return 'FAILED'
    const [whole, fraction = ''] = value.split('.')
    total += Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  }
  return Number.isSafeInteger(total) && total === amount ? 'COMPLETED' : 'FAILED'
}

export const createSandboxGateways = (env: NodeJS.ProcessEnv): Gateways => {
  const gateways: Gateways = {}
  if (env.STRIPE_SECRET_KEY) {
    if (!env.STRIPE_SECRET_KEY.startsWith('sk_test_'))
      throw new Error('Use a Stripe test key with the sandbox example.')
    const stripe = new Stripe(env.STRIPE_SECRET_KEY)
    const dto = (intent: Stripe.PaymentIntent): StripePaymentIntent => ({
      id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      client_secret: intent.client_secret,
      next_action: intent.next_action
        ? {
            type: intent.next_action.type,
            redirect_to_url: intent.next_action.redirect_to_url?.url
              ? { url: intent.next_action.redirect_to_url.url }
              : null,
          }
        : null,
      last_payment_error: intent.last_payment_error
        ? {
            code: intent.last_payment_error.code,
            decline_code: intent.last_payment_error.decline_code,
            message: intent.last_payment_error.message,
          }
        : null,
    })
    gateways.stripe = {
      create: async (input, key) =>
        dto(
          await stripe.paymentIntents.create(
            {
              amount: input.amount,
              currency: input.currency.toLowerCase(),
              capture_method: 'automatic',
              payment_method_types: ['card'],
            },
            { idempotencyKey: key },
          ),
        ),
      get: async (record) => dto(await stripe.paymentIntents.retrieve(record.dto.id)),
      confirm: async (record, body, key) => {
        if (typeof body.paymentMethodId !== 'string' || !body.paymentMethodId.trim())
          throw new Error('A Stripe PaymentMethod is required.')
        const current = await stripe.paymentIntents.retrieve(record.dto.id)
        if (
          current.status === 'succeeded' ||
          current.status === 'processing' ||
          current.status === 'requires_action'
        )
          return dto(current)
        return dto(
          await stripe.paymentIntents.confirm(
            record.dto.id,
            { payment_method: body.paymentMethodId, return_url: record.returnUrl },
            { idempotencyKey: key },
          ),
        )
      },
      cancel: async (record, key) => {
        const current = await stripe.paymentIntents.retrieve(record.dto.id)
        return dto(
          current.status === 'succeeded' || current.status === 'canceled'
            ? current
            : await stripe.paymentIntents.cancel(record.dto.id, {}, { idempotencyKey: key }),
        )
      },
    }
  }
  if (env.ADYEN_API_KEY && env.ADYEN_MERCHANT_ACCOUNT) {
    const merchantAccount = env.ADYEN_MERCHANT_ACCOUNT
    const adyen = new CheckoutAPI(
      new Client({ apiKey: env.ADYEN_API_KEY, environment: EnvironmentEnum.TEST }),
    )
    const updated = (
      record: MerchantPayment,
      response: {
        resultCode?: string
        action?: unknown
        pspReference?: string
        refusalReason?: string
        refusalReasonCode?: string
      },
    ): AdyenPayment => {
      record.pspReference = response.pspReference ?? record.pspReference
      return {
        id: record.dto.id,
        amount: record.amount,
        currency: record.currency,
        resultCode: response.resultCode ?? 'Pending',
        action: (response.action as AdyenPayment['action']) ?? null,
        refusalReason: response.refusalReason,
        refusalReasonCode: response.refusalReasonCode,
      }
    }
    gateways.adyen = {
      create: async (input) => ({
        id: randomUUID(),
        amount: input.amount,
        currency: input.currency,
        resultCode: 'Created',
      }),
      get: async (record) => record.dto,
      confirm: async (record, body, key) => {
        if (!body.paymentMethod || typeof body.paymentMethod !== 'object')
          throw new Error('An Adyen paymentMethod is required.')
        return updated(
          record,
          await adyen.PaymentsApi.payments(
            {
              amount: { value: record.amount, currency: record.currency },
              merchantAccount,
              reference: record.dto.id,
              shopperReference: record.owner,
              returnUrl: record.returnUrl,
              paymentMethod: body.paymentMethod,
              browserInfo: body.browserInfo,
              origin: body.origin,
            } as Parameters<typeof adyen.PaymentsApi.payments>[0],
            { headers: { 'Idempotency-Key': key } },
          ),
        )
      },
      details: async (record, body, key) => {
        const action = (record.dto as AdyenPayment).action
        return updated(
          record,
          await adyen.PaymentsApi.paymentsDetails(
            { details: body.details, paymentData: action?.paymentData } as Parameters<
              typeof adyen.PaymentsApi.paymentsDetails
            >[0],
            { headers: { 'Idempotency-Key': key } },
          ),
        )
      },
      cancel: async (record, key) => {
        if ((record.dto as AdyenPayment).resultCode === 'Created')
          return { ...(record.dto as AdyenPayment), resultCode: 'Cancelled' }
        await adyen.ModificationsApi.cancelAuthorisedPayment(
          { merchantAccount, paymentReference: record.dto.id },
          { headers: { 'Idempotency-Key': key } },
        )
        // Cancellation is asynchronous. Only a verified webhook may mark it cancelled.
        return { ...(record.dto as AdyenPayment), resultCode: 'Pending', action: null }
      },
    }
  }
  if (env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET) {
    const paypal = new OrdersController(
      new PayPalClient({
        clientCredentialsAuthCredentials: {
          oAuthClientId: env.PAYPAL_CLIENT_ID,
          oAuthClientSecret: env.PAYPAL_CLIENT_SECRET,
        },
        environment: Environment.Sandbox,
      }),
    )
    const dto = (
      order: Order | undefined,
      input: Pick<NewPayment, 'amount' | 'currency'>,
    ): PayPalOrder => {
      if (!order?.id || !order.status) throw new Error('PayPal did not return an order status.')
      return {
        id: order.id,
        status: order.status as PayPalOrder['status'],
        amount: input.amount,
        currency: input.currency,
        approveUrl: order.links?.find(
          (link) => link.rel === 'payer-action' || link.rel === 'approve',
        )?.href,
        captureStatus: captureStatus(order, input.amount, input.currency),
      }
    }
    gateways.paypal = {
      create: async (input, key) =>
        dto(
          (
            await paypal.createOrder({
              body: {
                intent: CheckoutPaymentIntent.Capture,
                purchaseUnits: [
                  {
                    amount: {
                      currencyCode: input.currency,
                      value: (input.amount / 100).toFixed(2),
                    },
                  },
                ],
                applicationContext: { returnUrl: input.returnUrl, cancelUrl: input.returnUrl },
              },
              paypalRequestId: key,
              prefer: 'return=representation',
            })
          ).result,
          input,
        ),
      get: async (record) => dto((await paypal.getOrder({ id: record.dto.id })).result, record),
      confirm: async (record, _body, key) => {
        const current = (await paypal.getOrder({ id: record.dto.id })).result
        if (current?.status !== 'APPROVED') return dto(current, record)
        return dto(
          (
            await paypal.captureOrder({
              id: record.dto.id,
              paypalRequestId: key,
              prefer: 'return=representation',
            })
          ).result,
          record,
        )
      },
    }
  }
  return gateways
}
