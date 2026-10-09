import type { ActionSurface, PaymentActionKind } from '../domain/action'
import type { ActionEvidence } from '../domain/evidence'
import type { PaymentResult } from '../domain/result'
import type { CheckoutEngine } from './engine'
import type { EngineEvent, EngineEventType } from './events'
import type { CheckoutPhase } from './machine'

/** Categorical metadata only: no identifiers, amounts, messages, URLs or provider payloads. */
export interface CheckoutTelemetryEvent {
  readonly type: EngineEventType
  readonly phase?: CheckoutPhase
  readonly previous?: CheckoutPhase
  readonly status?: PaymentResult['status']
  readonly actionKind?: PaymentActionKind
  readonly surface?: ActionSurface
  readonly via?: ActionEvidence['via']
}

const member = <T extends string>(value: unknown, choices: readonly T[]): T | undefined =>
  choices.find((choice) => choice === value)

const phases: readonly CheckoutPhase[] = [
  'idle',
  'preparing',
  'ready',
  'creating',
  'confirming',
  'action_pending',
  'action_running',
  'resuming',
  'polling',
  'succeeded',
  'declined',
  'canceled',
  'failed',
]
const statuses: readonly PaymentResult['status'][] = [
  'requires_action',
  'processing',
  'succeeded',
  'declined',
  'error',
]
const kinds: readonly PaymentActionKind[] = [
  'redirect',
  'collect_fields',
  'sdk_handoff',
  'display',
  'poll',
]
const surfaces: readonly ActionSurface[] = ['top', 'iframe', 'popup', 'inline', 'none']
const evidenceKinds: readonly ActionEvidence['via'][] = [
  'post_message',
  'return_url',
  'sdk_callback',
  'poll',
  'aborted',
]

/** Use a whitelist rather than trying to redact arbitrarily nested SDK/error objects. */
export const toCheckoutTelemetryEvent = (event: EngineEvent): CheckoutTelemetryEvent => {
  switch (event.type) {
    case 'phase_changed':
      return {
        type: event.type,
        phase: member(event.phase, phases),
        previous: member(event.previous, phases),
      }
    case 'action_required':
      return { type: event.type, actionKind: member(event.action.kind, kinds) }
    case 'action_started':
      return {
        type: event.type,
        actionKind: member(event.action.kind, kinds),
        surface: member(event.surface, surfaces),
      }
    case 'action_finished':
      return {
        type: event.type,
        actionKind: member(event.action.kind, kinds),
        via: member(event.evidence.via, evidenceKinds),
      }
    case 'result':
      return { type: event.type, status: member(event.result.status, statuses) }
    case 'intent_created':
    case 'provider_changed':
    case 'error':
      return { type: event.type }
    default:
      throw new Error('Unknown checkout event type.')
  }
}

/** Observe the lifecycle without serializing raw engine events. Returns one unsubscribe. */
export const observeCheckout = (
  engine: Pick<CheckoutEngine, 'on'>,
  report: (event: CheckoutTelemetryEvent) => void,
): (() => void) => {
  const types: readonly EngineEventType[] = [
    'phase_changed',
    'provider_changed',
    'intent_created',
    'action_required',
    'action_started',
    'action_finished',
    'result',
    'error',
  ]
  const subscriptions = types.map((type) =>
    engine.on(type, (event) => report(toCheckoutTelemetryEvent(event))),
  )
  return () => subscriptions.forEach((unsubscribe) => unsubscribe())
}
