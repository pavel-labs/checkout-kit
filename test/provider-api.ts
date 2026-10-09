import { beforeEach } from 'vitest'
import { http, HttpResponse, type HttpHandler } from 'msw'
import type { ActionEvidence, PaymentAction } from '@checkout-kit/core'
import type { ConformanceCase } from '@checkout-kit/conformance'

type Protocol = 'stripe' | 'adyen' | 'paypal'
type RecordDto = {
  id: string
  amount: number
  currency: string
  scenario?: string
  settled?: boolean
  approved?: boolean
}
const DECLINE = 'The payment was declined.'

/** Wire-format fixture only. It never talks to a provider or represents sandbox verification. */
export const providerApiFixture = (
  protocol: Protocol,
): {
  handlers: HttpHandler[]
  evidenceFor: (action: PaymentAction, scenario: ConformanceCase) => Promise<ActionEvidence>
  declineMessage: string
} => {
  const records = new Map<string, RecordDto>()
  const keys = new Map<string, string>()
  beforeEach(() => {
    records.clear()
    keys.clear()
  })
  const root = `http://payments.test/${protocol}`
  const collection = protocol === 'paypal' ? '/paypal/orders' : '/payments'
  const dto = (record: RecordDto): Record<string, unknown> => {
    const declined = record.scenario === 'decline' || record.scenario === 'challengeFail'
    const pending = record.scenario === 'processing'
    const challenge = record.scenario === 'challengePass' || record.scenario === 'challengeFail'
    const { id, amount, currency } = record
    if (protocol === 'stripe')
      return {
        id,
        amount,
        currency,
        status: record.settled
          ? declined
            ? 'requires_payment_method'
            : pending
              ? 'processing'
              : 'succeeded'
          : challenge
            ? 'requires_action'
            : 'requires_payment_method',
        next_action:
          !record.settled && challenge
            ? { type: 'redirect_to_url', redirect_to_url: { url: `${root}/approve/${id}` } }
            : null,
        last_payment_error:
          record.settled && declined ? { code: 'declined', message: DECLINE } : null,
      }
    if (protocol === 'adyen')
      return {
        id,
        amount,
        currency,
        resultCode: record.settled
          ? declined
            ? 'Refused'
            : pending
              ? 'Pending'
              : 'Authorised'
          : challenge
            ? 'RedirectShopper'
            : 'Pending',
        action:
          !record.settled && challenge
            ? { type: 'redirect', url: `${root}/approve/${id}`, paymentData: `data_${id}` }
            : null,
        refusalReason: declined ? DECLINE : undefined,
      }
    return {
      id,
      amount,
      currency,
      status: record.settled ? 'COMPLETED' : record.approved ? 'APPROVED' : 'CREATED',
      approveUrl: `${root}/approve/${id}`,
      captureStatus: record.settled
        ? declined
          ? 'DECLINED'
          : pending
            ? 'PENDING'
            : 'COMPLETED'
        : undefined,
    }
  }
  const handlers: HttpHandler[] = [
    http.post(`${root}${collection}${protocol === 'adyen' ? '/sessions' : ''}`, ({ request }) => {
      const key = request.headers.get('Idempotency-Key') ?? crypto.randomUUID()
      let id = keys.get(key)
      if (!id) {
        id = `payment_${records.size + 1}`
        records.set(id, { id, amount: 2500, currency: 'USD' })
        keys.set(key, id)
      }
      return HttpResponse.json(dto(records.get(id)!))
    }),
    http.get(`${root}${collection}/:id`, ({ params }) => {
      const record = records.get(String(params.id))
      return record ? HttpResponse.json(dto(record)) : new HttpResponse(null, { status: 404 })
    }),
    http.post(
      `${root}${collection}/:id${protocol === 'stripe' ? '/confirm' : protocol === 'paypal' ? '/capture' : ''}`,
      async ({ params, request }) => {
        const record = records.get(String(params.id))
        if (!record) return new HttpResponse(null, { status: 404 })
        const body = (await request.json()) as {
          paymentMethodId?: string
          paymentMethod?: { storedPaymentMethodId?: string }
        }
        const scenario =
          (body.paymentMethodId ?? body.paymentMethod?.storedPaymentMethodId)?.replace(
            'pm_mock_',
            '',
          ) ??
          record.scenario ??
          'approve'
        record.scenario = scenario
        record.settled =
          protocol === 'paypal' || (scenario !== 'challengePass' && scenario !== 'challengeFail')
        return HttpResponse.json(dto(record))
      },
    ),
    http.post(`${root}${collection}/:id/details`, async ({ params }) => {
      const record = records.get(String(params.id))
      return record ? HttpResponse.json(dto(record)) : new HttpResponse(null, { status: 404 })
    }),
    http.post(`${root}${collection}/:id/cancel`, ({ params }) => {
      const record = records.get(String(params.id))
      return HttpResponse.json({ ...record, status: 'canceled', resultCode: 'Cancelled' })
    }),
    http.post(`${root}/approve/:id`, async ({ params, request }) => {
      const record = records.get(String(params.id))
      const body = (await request.json()) as { scenario: string; actionId: string }
      const expected =
        protocol === 'adyen' ? `${params.id}:redirect:RedirectShopper` : String(params.id)
      if (!record || body.actionId !== expected) return new HttpResponse(null, { status: 404 })
      record.scenario = body.scenario
      if (protocol === 'paypal') record.approved = true
      else record.settled = true
      return HttpResponse.json({ ok: true })
    }),
  ]
  return {
    handlers,
    declineMessage: protocol === 'paypal' ? 'The payment was not captured successfully.' : DECLINE,
    evidenceFor: async (action, scenario): Promise<ActionEvidence> => {
      const id = protocol === 'adyen' ? action.id.split(':')[0] : action.id
      await fetch(`${root}/approve/${id}`, {
        method: 'POST',
        body: JSON.stringify({ scenario, actionId: action.id }),
        headers: { 'content-type': 'application/json' },
      })
      return {
        via: 'return_url',
        actionId: action.id,
        params: protocol === 'adyen' ? { redirectResult: 'verified_details' } : {},
      }
    },
  }
}
