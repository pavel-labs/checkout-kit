import { createHttpClient, type HttpClient } from '@checkout-kit/core/http'
import type {
  PaymentIntent,
  PaymentProvider,
  PaymentProviderInstance,
  PaymentResult,
  ProviderCapabilities,
  ProviderContext,
  CallOptions,
} from '@checkout-kit/core'

export interface StripeConfig {
  /** Your merchant API, never api.stripe.com. */
  readonly baseUrl: string
  readonly credentials?: RequestCredentials
  /** Matches an adapter registered with the browser runtime. Defaults to `stripe`. */
  readonly sdk?: string
}

declare module '@checkout-kit/core' {
  interface ProviderConfigRegistry {
    stripe: StripeConfig
  }
}

export type StripeStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'succeeded'
  | 'canceled'

/** The safe subset your server returns from a Stripe PaymentIntent. */
export interface StripePaymentIntent {
  readonly id: string
  readonly amount: number
  readonly currency: string
  readonly status: StripeStatus
  readonly client_secret?: string | null
  readonly next_action?: {
    readonly type: string
    readonly redirect_to_url?: { readonly url: string } | null
  } | null
  readonly last_payment_error?: {
    readonly code?: string
    readonly decline_code?: string
    readonly message?: string
  } | null
}

export const PROVIDER_ID = 'stripe'
const capabilities: ProviderCapabilities = {
  instruments: ['token'],
  actions: ['redirect', 'sdk_handoff'],
  surfaces: ['top', 'none'],
  authentication: ['none', '3ds2'],
  session: 'lazy',
  cancel: true,
  poll: true,
  idempotency: 'header',
}

const toIntent = (dto: StripePaymentIntent): PaymentIntent => {
  if (
    typeof dto.id !== 'string' ||
    !dto.id ||
    !Number.isSafeInteger(dto.amount) ||
    dto.amount < 0 ||
    typeof dto.currency !== 'string' ||
    !/^[a-z]{3}$/i.test(dto.currency)
  )
    throw new Error('Invalid Stripe payment response.')
  return {
    id: dto.id,
    amount: dto.amount,
    currency: dto.currency.toUpperCase(),
    providerId: PROVIDER_ID,
    status:
      dto.status === 'requires_payment_method' && dto.last_payment_error
        ? 'declined'
        : dto.status === 'requires_capture'
          ? 'processing'
          : dto.status === 'requires_confirmation'
            ? 'requires_payment_method'
            : dto.status,
  }
}

export const createStripeProvider = (
  ctx: ProviderContext<StripeConfig>,
  http: HttpClient = createHttpClient({
    baseUrl: ctx.config.baseUrl,
    credentials: ctx.config.credentials,
    fetch: ctx.fetch,
  }),
): PaymentProviderInstance => {
  const path = (id: string): string => `/payments/${encodeURIComponent(id)}`
  const options = (opts: CallOptions, operation: string) => ({
    signal: opts.signal,
    headers: { 'Idempotency-Key': `${opts.idempotencyKey}:${operation}` },
  })
  const read = (id: string, opts: CallOptions) =>
    http.get<StripePaymentIntent>(path(id), { signal: opts.signal })
  const error = (code: string, message: string, intent?: PaymentIntent): PaymentResult => ({
    status: 'error',
    error: { code, message },
    intent,
  })
  const toResult = (dto: StripePaymentIntent): PaymentResult => {
    const intent = toIntent(dto)
    switch (dto.status) {
      case 'succeeded':
        return { status: 'succeeded', intent }
      case 'processing':
        return { status: 'processing', intent }
      case 'requires_capture':
        return error(
          'capture_required',
          'The payment is authorized and still needs capture on your server.',
          intent,
        )
      case 'canceled':
        return error('canceled', 'The payment was canceled.', intent)
      case 'requires_action': {
        if (dto.next_action?.type === 'redirect_to_url' && dto.next_action.redirect_to_url?.url)
          return {
            status: 'requires_action',
            intent,
            action: {
              id: dto.id,
              kind: 'redirect',
              purpose: 'authenticate',
              surface: 'top',
              url: dto.next_action.redirect_to_url.url,
              method: 'GET',
              completion: { via: 'return_url' },
            },
          }
        if (dto.next_action?.type === 'use_stripe_sdk' && dto.client_secret)
          return {
            status: 'requires_action',
            intent,
            action: {
              id: dto.id,
              kind: 'sdk_handoff',
              purpose: 'authenticate',
              surface: 'none',
              sdk: ctx.config.sdk ?? 'stripe',
              params: { clientSecret: dto.client_secret },
              completion: { via: 'sdk_callback' },
            },
          }
        return error(
          'unsupported_action',
          'Stripe returned an action this integration cannot run.',
          intent,
        )
      }
      case 'requires_payment_method':
      case 'requires_confirmation':
        return dto.last_payment_error
          ? {
              status: 'declined',
              intent,
              error: {
                code:
                  dto.last_payment_error.decline_code ?? dto.last_payment_error.code ?? 'declined',
                message: dto.last_payment_error.message ?? 'The payment was declined.',
              },
            }
          : error('not_completed', 'The payment was not completed.', intent)
      default:
        return error('unsupported_status', 'Stripe returned an unknown payment status.', intent)
    }
  }
  return {
    createIntent: async (input, opts) =>
      toIntent(
        await http.post<StripePaymentIntent>(
          '/payments',
          { planId: input.planId },
          options(opts, 'create'),
        ),
      ),
    confirm: async (id, instrument, opts) => {
      if (instrument.kind !== 'token' || !instrument.token.trim())
        return error(
          'unsupported_instrument',
          'Provide a PaymentMethod id collected with Stripe.js.',
        )
      try {
        return toResult(
          await http.post<StripePaymentIntent>(
            `${path(id)}/confirm`,
            { paymentMethodId: instrument.token },
            options(opts, `confirm:${id}`),
          ),
        )
      } catch {
        // A lost response can hide a successful confirmation. Read before inviting a retry.
        try {
          return toResult(await read(id, opts))
        } catch {
          return error(
            'confirm_failed',
            'The payment could not be confirmed. Check its status before retrying.',
          )
        }
      }
    },
    resume: async (id, evidence, opts) => {
      if (
        evidence.actionId !== id ||
        (evidence.via !== 'return_url' &&
          evidence.via !== 'sdk_callback' &&
          evidence.via !== 'poll')
      )
        return error('invalid_evidence', 'This evidence cannot complete the Stripe payment.')
      try {
        return toResult(await read(id, opts))
      } catch {
        return error('payment_unreadable', 'The payment status is temporarily unavailable.')
      }
    },
    getIntent: async (id, opts) => toIntent(await read(id, opts)),
    cancel: async (id, opts) =>
      toIntent(
        await http.post<StripePaymentIntent>(
          `${path(id)}/cancel`,
          {},
          options(opts, `cancel:${id}`),
        ),
      ),
  }
}

export const stripeProvider: PaymentProvider<StripeConfig> = {
  id: PROVIDER_ID,
  displayName: 'Stripe',
  capabilities,
  create: createStripeProvider,
}
export default stripeProvider
