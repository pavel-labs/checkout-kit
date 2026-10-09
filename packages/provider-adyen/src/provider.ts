import { createHttpClient, type HttpClient } from '@checkout-kit/core/http'
import type {
  CallOptions,
  PaymentAction,
  PaymentIntent,
  PaymentProvider,
  PaymentProviderInstance,
  PaymentResult,
  ProviderCapabilities,
  ProviderContext,
} from '@checkout-kit/core'

export interface AdyenConfig {
  readonly baseUrl: string
  readonly credentials?: RequestCredentials
  readonly sdk?: string
  /** Omit when the host imports @adyen/adyen-web itself. */
  readonly scriptUrl?: string
  readonly integrity?: string
}
declare module '@checkout-kit/core' {
  interface ProviderConfigRegistry {
    adyen: AdyenConfig
  }
}
export interface AdyenAction {
  readonly type: string
  readonly paymentData?: string
  readonly url?: string
  readonly method?: 'GET' | 'POST'
  readonly data?: Readonly<Record<string, string>>
  readonly token?: string
  readonly subtype?: string
  readonly [key: string]: unknown
}
/** Merchant-owned id and price, plus the safe fields from /payments or /payments/details. */
export interface AdyenPayment {
  readonly id: string
  readonly amount: number
  readonly currency: string
  readonly resultCode: string
  readonly action?: AdyenAction | null
  readonly refusalReason?: string
  readonly refusalReasonCode?: string
}
export const PROVIDER_ID = 'adyen'
const capabilities: ProviderCapabilities = {
  instruments: ['card', 'token', 'wallet'],
  actions: ['redirect', 'sdk_handoff'],
  surfaces: ['top', 'none'],
  authentication: ['none', '3ds1', '3ds2'],
  session: 'lazy',
  cancel: true,
  poll: true,
  idempotency: 'header',
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const toIntent = (dto: AdyenPayment): PaymentIntent => {
  if (
    typeof dto.id !== 'string' ||
    !dto.id ||
    !Number.isSafeInteger(dto.amount) ||
    dto.amount < 0 ||
    typeof dto.currency !== 'string' ||
    !/^[a-z]{3}$/i.test(dto.currency)
  )
    throw new Error('Invalid Adyen payment response.')
  return {
    id: dto.id,
    amount: dto.amount,
    currency: dto.currency.toUpperCase(),
    providerId: PROVIDER_ID,
    status:
      dto.resultCode === 'Authorised'
        ? 'succeeded'
        : dto.resultCode === 'Refused' || dto.resultCode === 'Error'
          ? 'declined'
          : dto.resultCode === 'Cancelled'
            ? 'canceled'
            : ['Pending', 'Received'].includes(dto.resultCode)
              ? 'processing'
              : dto.action
                ? 'requires_action'
                : 'requires_payment_method',
  }
}
export const createAdyenProvider = (
  ctx: ProviderContext<AdyenConfig>,
  http: HttpClient = createHttpClient({
    baseUrl: ctx.config.baseUrl,
    credentials: ctx.config.credentials,
    fetch: ctx.fetch,
  }),
): PaymentProviderInstance => {
  const issuedActions = new Map<string, Set<string>>()
  const remember = (id: string, action: PaymentAction): void => {
    const actions = issuedActions.get(id) ?? new Set<string>()
    actions.add(action.id)
    issuedActions.set(id, actions)
  }
  const path = (id: string) => `/payments/${encodeURIComponent(id)}`
  const options = (opts: CallOptions, operation: string) => ({
    signal: opts.signal,
    headers: { 'Idempotency-Key': `${opts.idempotencyKey}:${operation}` },
  })
  const error = (code: string, message: string, intent?: PaymentIntent): PaymentResult => ({
    status: 'error',
    intent,
    error: { code, message },
  })
  const toAction = (dto: AdyenPayment, action: AdyenAction): PaymentAction | null => {
    const id = `${dto.id}:${action.type}:${action.subtype ?? dto.resultCode}`
    if (action.type === 'redirect')
      return action.url
        ? {
            id,
            kind: 'redirect',
            purpose: 'authenticate',
            surface: 'top',
            url: action.url,
            method: action.method ?? 'GET',
            fields: action.data,
            completion: { via: 'return_url' },
          }
        : null
    if (['threeDS2', 'threeDS2Fingerprint', 'threeDS2Challenge'].includes(action.type))
      return {
        id,
        kind: 'sdk_handoff',
        purpose: 'authenticate',
        surface: 'none',
        sdk: ctx.config.sdk ?? 'adyen',
        scriptUrl: ctx.config.scriptUrl,
        integrity: ctx.config.integrity,
        params: { action },
        completion: { via: 'sdk_callback' },
      }
    return null
  }
  const toResult = (dto: AdyenPayment): PaymentResult => {
    const intent = toIntent(dto)
    if (dto.action) {
      const action = toAction(dto, dto.action)
      if (action) remember(dto.id, action)
      return action
        ? { status: 'requires_action', intent, action }
        : error(
            'unsupported_action',
            'Adyen returned an action this integration cannot run.',
            intent,
          )
    }
    switch (dto.resultCode) {
      case 'Authorised':
        return { status: 'succeeded', intent }
      case 'Pending':
      case 'Received':
        return { status: 'processing', intent }
      case 'Refused':
        return {
          status: 'declined',
          intent,
          error: {
            code: dto.refusalReasonCode ?? 'refused',
            message: dto.refusalReason ?? 'The payment was refused.',
          },
        }
      case 'Cancelled':
        return error('canceled', 'The payment was canceled.', intent)
      default:
        return error(
          'payment_error',
          dto.refusalReason ?? 'The payment could not be completed.',
          intent,
        )
    }
  }
  return {
    createIntent: async (input, opts) =>
      toIntent(
        await http.post<AdyenPayment>(
          '/payments/sessions',
          { planId: input.planId },
          options(opts, 'create'),
        ),
      ),
    confirm: async (id, instrument, opts) => {
      let body: Record<string, unknown>
      if (instrument.kind === 'token' && instrument.token.trim())
        body = { paymentMethod: { type: 'scheme', storedPaymentMethodId: instrument.token } }
      else if (instrument.kind === 'card') {
        const exp = instrument.exp.replace(/\D/g, '')
        body = {
          paymentMethod: {
            type: 'scheme',
            number: instrument.number.replace(/\D/g, ''),
            expiryMonth: exp.slice(0, 2),
            expiryYear: `20${exp.slice(-2)}`,
            cvc: instrument.cvc,
            holderName: instrument.holder,
          },
        }
      } else if (
        instrument.kind === 'wallet' &&
        instrument.walletId === 'adyen' &&
        isRecord(instrument.payload) &&
        isRecord(instrument.payload.paymentMethod)
      ) {
        body = {
          paymentMethod: instrument.payload.paymentMethod,
          browserInfo: instrument.payload.browserInfo,
          origin: instrument.payload.origin,
        }
      } else if (instrument.kind === 'wallet')
        return error(
          'invalid_instrument',
          'Adyen requires the paymentMethod returned by its component.',
        )
      else
        return error(
          'unsupported_instrument',
          'Provide an Adyen payment method, saved token or card.',
        )
      try {
        return toResult(
          await http.post<AdyenPayment>(path(id), body, options(opts, `confirm:${id}`)),
        )
      } catch {
        return error('payment_failed', 'The payment status is temporarily unavailable.')
      }
    },
    resume: async (id, evidence, opts) => {
      if (!issuedActions.get(id)?.has(evidence.actionId))
        return error('invalid_evidence', 'The evidence belongs to another Adyen action.')
      let details: Record<string, unknown>
      if (evidence.via === 'return_url') {
        details = Object.fromEntries(
          Object.entries(evidence.params).filter(([key]) =>
            ['redirectResult', 'payload', 'PaRes', 'MD'].includes(key),
          ),
        )
        if (!Object.keys(details).length)
          return error('invalid_evidence', 'The redirect did not contain Adyen payment details.')
      } else if (evidence.via === 'sdk_callback' && isRecord(evidence.payload)) {
        details = isRecord(evidence.payload.details) ? evidence.payload.details : evidence.payload
      } else return error('invalid_evidence', 'Adyen requires redirect or SDK details.')
      try {
        return toResult(
          await http.post<AdyenPayment>(
            `${path(id)}/details`,
            { details },
            options(opts, `details:${evidence.actionId}`),
          ),
        )
      } catch {
        return error('details_failed', 'The authentication status is temporarily unavailable.')
      }
    },
    getIntent: async (id, opts) => {
      const dto = await http.get<AdyenPayment>(path(id), { signal: opts.signal })
      if (dto.action) {
        const action = toAction(dto, dto.action)
        if (action) remember(id, action)
      }
      return toIntent(dto)
    },
    cancel: async (id, opts) => {
      const current = toIntent(await http.get<AdyenPayment>(path(id), { signal: opts.signal }))
      if (['succeeded', 'declined', 'canceled'].includes(current.status)) return current
      return toIntent(
        await http.post<AdyenPayment>(`${path(id)}/cancel`, {}, options(opts, `cancel:${id}`)),
      )
    },
  }
}
export const adyenProvider: PaymentProvider<AdyenConfig> = {
  id: PROVIDER_ID,
  displayName: 'Adyen',
  capabilities,
  create: createAdyenProvider,
}
export default adyenProvider
