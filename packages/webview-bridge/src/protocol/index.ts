// The contract between a checkout running in a WebView and the app hosting it.
//
// Types only, no DOM and no engine: this half has to compile in a React Native bundle.

import { PHASE_TO_UI_STATE, type CheckoutPhase, type PaymentUiState } from '@checkout-kit/core'

export const BRIDGE_VERSION = 1

/** Every message carries this. `source` is the discriminator - a WebView receives everything. */
export interface BridgeEnvelope<TType extends string, TPayload> {
  readonly source: 'checkout-kit'
  readonly v: number
  readonly id: string
  /** One checkout attempt. Lets the host drop messages from a WebView it has reloaded. */
  readonly sessionId: string
  /** Set on a reply, to the id of the command it answers. */
  readonly correlationId?: string
  readonly ts: number
  readonly type: TType
  readonly payload: TPayload
}

export interface PaymentReadyPayload {
  readonly bridgeVersion: number
  readonly providerId: string | null
  readonly instruments: readonly string[]
  readonly actions: readonly string[]
}

export interface PaymentStateChangedPayload {
  readonly state: PaymentUiState
  readonly phase: CheckoutPhase
  readonly previousPhase: CheckoutPhase | null
}

export interface PaymentIntentCreatedPayload {
  readonly intentId: string
  readonly amount: number
  readonly currency: string
  readonly providerId: string
}

export interface PaymentActionPayload {
  readonly actionId: string
  readonly kind: string
  readonly surface: string
  readonly purpose: string
  /** Only for a redirect, so the host can decide to open it outside the WebView. */
  readonly url?: string
}

export interface PaymentSucceededPayload {
  readonly intentId: string
  readonly amount: number
  readonly currency: string
}

export interface PaymentDeclinedPayload {
  readonly intentId: string | null
  readonly code?: string
  readonly message: string
}

export interface PaymentCanceledPayload {
  readonly intentId: string | null
  readonly reason: string
}

export interface PaymentFailedPayload {
  readonly code?: string
  readonly message: string
}

export interface PaymentHeightPayload {
  readonly height: number
}

export type BridgeEvent =
  | BridgeEnvelope<'PAYMENT_READY', PaymentReadyPayload>
  | BridgeEnvelope<'PAYMENT_STATE_CHANGED', PaymentStateChangedPayload>
  | BridgeEnvelope<'PAYMENT_INTENT_CREATED', PaymentIntentCreatedPayload>
  | BridgeEnvelope<'PAYMENT_REQUIRES_ACTION', PaymentActionPayload>
  | BridgeEnvelope<'PAYMENT_ACTION_STARTED', PaymentActionPayload>
  | BridgeEnvelope<'PAYMENT_ACTION_FINISHED', PaymentActionPayload>
  | BridgeEnvelope<'PAYMENT_SUCCEEDED', PaymentSucceededPayload>
  | BridgeEnvelope<'PAYMENT_DECLINED', PaymentDeclinedPayload>
  | BridgeEnvelope<'PAYMENT_CANCELLED', PaymentCanceledPayload>
  | BridgeEnvelope<'PAYMENT_FAILED', PaymentFailedPayload>
  | BridgeEnvelope<'PAYMENT_HEIGHT_CHANGED', PaymentHeightPayload>

export type BridgeEventType = BridgeEvent['type']

export type BridgeCommand =
  | BridgeEnvelope<'PAYMENT_CANCEL', Record<string, never>>
  | BridgeEnvelope<'PAYMENT_RETRY', Record<string, never>>
  /** Query parameters collected outside the WebView, e.g. from a return deep link. */
  | BridgeEnvelope<'PAYMENT_RESUME', { readonly params: Readonly<Record<string, string>> }>
  | BridgeEnvelope<'PAYMENT_SET_THEME', { readonly theme: 'light' | 'dark' | 'auto' }>
  | BridgeEnvelope<'PAYMENT_PING', Record<string, never>>

export type BridgeCommandType = BridgeCommand['type']

export type ParseResult<T> =
  | { readonly ok: true; readonly message: T }
  | { readonly ok: false; readonly reason: 'not_ours' | 'malformed' | 'unsupported_version' }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'
const isId = (value: unknown): value is string => isString(value) && value.trim().length > 0
const isOptionalString = (value: unknown): boolean => value === undefined || isString(value)
const isStringArray = (value: unknown): boolean => Array.isArray(value) && value.every(isString)
const isAmount = (value: unknown): boolean => Number.isSafeInteger(value) && (value as number) >= 0
const isPhase = (value: unknown): value is CheckoutPhase =>
  isString(value) && Object.hasOwn(PHASE_TO_UI_STATE, value)
const isPayment = (payload: Record<string, unknown>): boolean =>
  isId(payload.intentId) &&
  isAmount(payload.amount) &&
  isString(payload.currency) &&
  /^[a-z]{3}$/i.test(payload.currency)
const isAction = (payload: Record<string, unknown>): boolean =>
  isId(payload.actionId) &&
  ['redirect', 'collect_fields', 'sdk_handoff', 'display', 'poll'].includes(String(payload.kind)) &&
  ['top', 'iframe', 'popup', 'inline', 'none'].includes(String(payload.surface)) &&
  ['authenticate', 'authorize', 'collect'].includes(String(payload.purpose)) &&
  isOptionalString(payload.url)

const isEnvelope = (
  value: Record<string, unknown>,
): value is Record<string, unknown> & BridgeEnvelope<string, Record<string, unknown>> =>
  Number.isInteger(value.v) &&
  isId(value.id) &&
  isId(value.sessionId) &&
  isId(value.type) &&
  typeof value.ts === 'number' &&
  Number.isFinite(value.ts) &&
  value.ts >= 0 &&
  isOptionalString(value.correlationId) &&
  isRecord(value.payload)

const eventPayloadIsValid = (type: string, payload: Record<string, unknown>): boolean => {
  switch (type) {
    case 'PAYMENT_READY':
      return (
        payload.bridgeVersion === BRIDGE_VERSION &&
        (payload.providerId === null || isId(payload.providerId)) &&
        isStringArray(payload.instruments) &&
        isStringArray(payload.actions)
      )
    case 'PAYMENT_STATE_CHANGED':
      return (
        isPhase(payload.phase) &&
        PHASE_TO_UI_STATE[payload.phase] === payload.state &&
        (payload.previousPhase === null || isPhase(payload.previousPhase))
      )
    case 'PAYMENT_INTENT_CREATED':
      return isPayment(payload) && isId(payload.providerId)
    case 'PAYMENT_SUCCEEDED':
      return isPayment(payload)
    case 'PAYMENT_REQUIRES_ACTION':
    case 'PAYMENT_ACTION_STARTED':
    case 'PAYMENT_ACTION_FINISHED':
      return isAction(payload)
    case 'PAYMENT_DECLINED':
      return (
        (payload.intentId === null || isId(payload.intentId)) &&
        isOptionalString(payload.code) &&
        isString(payload.message)
      )
    case 'PAYMENT_CANCELLED':
      return (payload.intentId === null || isId(payload.intentId)) && isString(payload.reason)
    case 'PAYMENT_FAILED':
      return isOptionalString(payload.code) && isString(payload.message)
    case 'PAYMENT_HEIGHT_CHANGED':
      return (
        typeof payload.height === 'number' && Number.isFinite(payload.height) && payload.height >= 0
      )
    default:
      return false
  }
}

const commandPayloadIsValid = (type: string, payload: Record<string, unknown>): boolean => {
  switch (type) {
    case 'PAYMENT_CANCEL':
    case 'PAYMENT_RETRY':
    case 'PAYMENT_PING':
      return Object.keys(payload).length === 0
    case 'PAYMENT_RESUME':
      return isRecord(payload.params) && Object.values(payload.params).every(isString)
    case 'PAYMENT_SET_THEME':
      return ['light', 'dark', 'auto'].includes(String(payload.theme))
    default:
      return false
  }
}

const parse = <T extends BridgeEnvelope<string, unknown>>(
  raw: unknown,
  validatePayload: (type: string, payload: Record<string, unknown>) => boolean,
): ParseResult<T> => {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return { ok: false, reason: 'not_ours' }
    }
  }
  if (!isRecord(value) || value.source !== 'checkout-kit') return { ok: false, reason: 'not_ours' }
  if (!isEnvelope(value)) return { ok: false, reason: 'malformed' }
  if (value.v !== BRIDGE_VERSION) return { ok: false, reason: 'unsupported_version' }
  if (!validatePayload(value.type, value.payload)) return { ok: false, reason: 'malformed' }
  return { ok: true, message: value as T }
}

/** Host side: validate the envelope, event type and event-specific payload. */
export const parseBridgeEvent = (raw: unknown): ParseResult<BridgeEvent> =>
  parse<BridgeEvent>(raw, eventPayloadIsValid)

/** Web side: validate the envelope, command type and command-specific payload. */
export const parseBridgeCommand = (raw: unknown): ParseResult<BridgeCommand> =>
  parse<BridgeCommand>(raw, commandPayloadIsValid)
