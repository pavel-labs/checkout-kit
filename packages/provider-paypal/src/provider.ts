import { createHttpClient, type HttpClient } from '@checkout-kit/core/http'
import type {
  CallOptions,
  PaymentIntent,
  PaymentProvider,
  PaymentProviderInstance,
  PaymentResult,
  ProviderCapabilities,
  ProviderContext,
} from '@checkout-kit/core'

export interface PayPalConfig {
  readonly baseUrl: string
  readonly credentials?: RequestCredentials
}
declare module '@checkout-kit/core' {
  interface ProviderConfigRegistry {
    paypal: PayPalConfig
  }
}
export type PayPalOrderStatus =
  'CREATED' | 'SAVED' | 'APPROVED' | 'PAYER_ACTION_REQUIRED' | 'VOIDED' | 'COMPLETED'
export type PayPalCaptureStatus =
  'COMPLETED' | 'PENDING' | 'DECLINED' | 'DENIED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
/** Merchant DTO. captureStatus comes from purchase_units[].payments.captures[], not the order status. */
export interface PayPalOrder {
  readonly id: string
  readonly status: PayPalOrderStatus
  readonly amount: number
  readonly currency: string
  readonly approveUrl?: string
  readonly captureStatus?: PayPalCaptureStatus
}
export const PROVIDER_ID = 'paypal'
const capabilities: ProviderCapabilities = {
  instruments: ['none'],
  actions: ['redirect'],
  surfaces: ['top'],
  authentication: ['none'],
  session: 'lazy',
  cancel: false,
  poll: true,
  idempotency: 'header',
}
const toIntent = (dto: PayPalOrder): PaymentIntent => {
  if (
    typeof dto.id !== 'string' ||
    !dto.id ||
    !Number.isSafeInteger(dto.amount) ||
    dto.amount < 0 ||
    typeof dto.currency !== 'string' ||
    !/^[a-z]{3}$/i.test(dto.currency)
  )
    throw new Error('Invalid PayPal order response.')
  const captured = dto.status === 'COMPLETED' && dto.captureStatus === 'COMPLETED'
  return {
    id: dto.id,
    amount: dto.amount,
    currency: dto.currency.toUpperCase(),
    providerId: PROVIDER_ID,
    status: captured
      ? 'succeeded'
      : dto.status === 'VOIDED'
        ? 'canceled'
        : dto.captureStatus &&
            ['DECLINED', 'DENIED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(
              dto.captureStatus,
            )
          ? 'declined'
          : dto.status === 'COMPLETED' || dto.status === 'APPROVED'
            ? 'processing'
            : 'requires_payment_method',
  }
}
export const createPayPalProvider = (
  ctx: ProviderContext<PayPalConfig>,
  http: HttpClient = createHttpClient({
    baseUrl: ctx.config.baseUrl,
    credentials: ctx.config.credentials,
    fetch: ctx.fetch,
  }),
): PaymentProviderInstance => {
  const path = (id: string) => `/paypal/orders/${encodeURIComponent(id)}`
  const options = (opts: CallOptions, operation: string) => ({
    signal: opts.signal,
    headers: { 'Idempotency-Key': `${opts.idempotencyKey}:${operation}` },
  })
  const error = (code: string, message: string, intent?: PaymentIntent): PaymentResult => ({
    status: 'error',
    intent,
    error: { code, message },
  })
  const read = (id: string, opts: CallOptions) =>
    http.get<PayPalOrder>(path(id), { signal: opts.signal })
  const toResult = (dto: PayPalOrder): PaymentResult => {
    const intent = toIntent(dto)
    if (intent.status === 'succeeded') return { status: 'succeeded', intent }
    if (intent.status === 'declined')
      return {
        status: 'declined',
        intent,
        error: { code: dto.captureStatus, message: 'The payment was not captured successfully.' },
      }
    if (intent.status === 'canceled') return error('canceled', 'The order was canceled.', intent)
    if (dto.status === 'COMPLETED' && !dto.captureStatus)
      return error('capture_unverified', 'The server did not return the capture status.', intent)
    if (intent.status === 'processing') return { status: 'processing', intent }
    return error('not_approved', 'The order has not been approved.', intent)
  }
  const capture = async (dto: PayPalOrder, opts: CallOptions): Promise<PaymentResult> => {
    if (dto.status !== 'APPROVED') return toResult(dto)
    return toResult(
      await http.post<PayPalOrder>(
        `${path(dto.id)}/capture`,
        {},
        options(opts, `capture:${dto.id}`),
      ),
    )
  }
  return {
    createIntent: async (input, opts) =>
      toIntent(
        await http.post<PayPalOrder>(
          '/paypal/orders',
          { planId: input.planId },
          options(opts, 'create'),
        ),
      ),
    confirm: async (id, instrument, opts) => {
      if (instrument.kind !== 'none')
        return error(
          'unsupported_instrument',
          'PayPal collects the payment details on its own page.',
        )
      try {
        const order = await read(id, opts)
        if (order.status === 'APPROVED') return await capture(order, opts)
        if (order.status === 'COMPLETED' || order.status === 'VOIDED') return toResult(order)
        if (!order.approveUrl)
          return error(
            'no_approval_url',
            'PayPal did not return an approval link.',
            toIntent(order),
          )
        return {
          status: 'requires_action',
          intent: toIntent(order),
          action: {
            id: id,
            kind: 'redirect',
            purpose: 'authorize',
            surface: 'top',
            url: order.approveUrl,
            method: 'GET',
            completion: { via: 'return_url' },
          },
        }
      } catch {
        return error('order_unreadable', 'The order could not be read.')
      }
    },
    resume: async (id, evidence, opts) => {
      if (
        evidence.via !== 'return_url' ||
        evidence.actionId !== id ||
        (evidence.params.token && evidence.params.token !== id)
      )
        return error('invalid_evidence', 'This return does not belong to the PayPal order.')
      try {
        return await capture(await read(id, opts), opts)
      } catch {
        try {
          return toResult(await read(id, opts))
        } catch {
          return error('capture_failed', 'The capture status is temporarily unavailable.')
        }
      }
    },
    getIntent: async (id, opts) => toIntent(await read(id, opts)),
  }
}
export const payPalProvider: PaymentProvider<PayPalConfig> = {
  id: PROVIDER_ID,
  displayName: 'PayPal',
  capabilities,
  create: createPayPalProvider,
}
export default payPalProvider
