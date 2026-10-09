import { randomUUID } from 'node:crypto'
import type { AdyenPayment } from '@checkout-kit/provider-adyen'
import type { PayPalOrder } from '@checkout-kit/provider-paypal'
import type { StripePaymentIntent } from '@checkout-kit/provider-stripe'
import type { Gateways, MerchantPayment, PaymentDto, Protocol } from './gateways'

/** Local protocol simulator, explicitly separate from sandbox SDK calls. */
export const createMockGateways = (apiOrigin: string): Gateways => {
  const approval = (protocol: Protocol, id: string) => `${apiOrigin}/mock/${protocol}/${id}`
  const outcome = (
    record: MerchantPayment,
    status: 'approve' | 'decline' | 'processing' | 'challenge',
  ): PaymentDto => {
    const common = { id: record.dto.id, amount: record.amount, currency: record.currency }
    if (record.protocol === 'stripe')
      return {
        ...common,
        status:
          status === 'approve'
            ? 'succeeded'
            : status === 'processing'
              ? 'processing'
              : status === 'challenge'
                ? 'requires_action'
                : 'requires_payment_method',
        next_action:
          status === 'challenge'
            ? { type: 'redirect_to_url', redirect_to_url: { url: approval('stripe', common.id) } }
            : null,
        last_payment_error:
          status === 'decline'
            ? { code: 'card_declined', message: 'The simulated payment was declined.' }
            : null,
      }
    if (record.protocol === 'adyen')
      return {
        ...common,
        resultCode:
          status === 'approve'
            ? 'Authorised'
            : status === 'processing'
              ? 'Pending'
              : status === 'challenge'
                ? 'RedirectShopper'
                : 'Refused',
        action:
          status === 'challenge'
            ? {
                type: 'redirect',
                url: approval('adyen', common.id),
                paymentData: 'mock-bound-payment-data',
              }
            : null,
        refusalReason: status === 'decline' ? 'The simulated payment was declined.' : undefined,
      }
    return {
      ...common,
      status: 'COMPLETED',
      captureStatus:
        status === 'approve' ? 'COMPLETED' : status === 'processing' ? 'PENDING' : 'DECLINED',
    }
  }
  const fromBody = (
    body: Record<string, unknown>,
  ): 'approve' | 'decline' | 'processing' | 'challenge' => {
    const method = body.paymentMethod as
      { storedPaymentMethodId?: string; number?: string } | undefined
    const value = String(
      body.paymentMethodId ?? method?.storedPaymentMethodId ?? method?.number ?? '',
    )
    return value.includes('decline')
      ? 'decline'
      : value.includes('processing')
        ? 'processing'
        : value.includes('challenge')
          ? 'challenge'
          : 'approve'
  }
  return {
    stripe: {
      create: async (input) => ({
        id: `pi_${randomUUID()}`,
        amount: input.amount,
        currency: input.currency,
        status: 'requires_payment_method',
      }),
      get: async (record) =>
        (record.dto as StripePaymentIntent).status === 'processing'
          ? outcome(record, 'approve')
          : record.dto,
      confirm: async (record, body) => outcome(record, fromBody(body)),
      cancel: async (record) => ({
        ...(record.dto as StripePaymentIntent),
        status: 'canceled',
        next_action: null,
      }),
      approve: async (record, accepted) => outcome(record, accepted ? 'approve' : 'decline'),
    },
    adyen: {
      create: async (input) => ({
        id: `adyen_${randomUUID()}`,
        amount: input.amount,
        currency: input.currency,
        resultCode: 'Created',
      }),
      get: async (record) =>
        (record.dto as AdyenPayment).resultCode === 'Pending'
          ? outcome(record, 'approve')
          : record.dto,
      confirm: async (record, body) => outcome(record, fromBody(body)),
      details: async (record, body) => {
        const details = body.details as { redirectResult?: string } | undefined
        if (details?.redirectResult !== record.dto.id) throw new Error('Unknown redirect evidence')
        return record.dto
      },
      cancel: async (record) => ({
        ...(record.dto as AdyenPayment),
        resultCode: 'Cancelled',
        action: null,
      }),
      approve: async (record, accepted) => outcome(record, accepted ? 'approve' : 'decline'),
    },
    paypal: {
      create: async (input) => {
        const id = `order_${randomUUID()}`
        return {
          id,
          amount: input.amount,
          currency: input.currency,
          status: 'CREATED',
          approveUrl: approval('paypal', id),
        }
      },
      get: async (record) => record.dto,
      confirm: async (record) =>
        (record.dto as PayPalOrder).status === 'APPROVED' ? outcome(record, 'approve') : record.dto,
      approve: async (record, accepted) => ({
        ...(record.dto as PayPalOrder),
        status: accepted ? 'APPROVED' : 'VOIDED',
      }),
    },
  }
}
