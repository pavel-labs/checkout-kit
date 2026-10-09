import { expect, it, vi } from 'vitest'
import { createCheckout } from './engine'
import { createFakeProvider } from '@checkout-kit/testing/engine'
import type { EngineEvent } from './events'
import { createRunnerRegistry } from './runner'
import { observeCheckout, toCheckoutTelemetryEvent } from './telemetry'

it('does not serialize secrets nested in SDK, evidence, error or intent payloads', () => {
  const action = {
    id: 'secret-action-id',
    kind: 'sdk_handoff',
    surface: 'none',
    purpose: 'authorize',
    sdk: 'wallet',
    completion: { via: 'sdk_callback' },
    params: { clientSecret: 'secret', number: '4242424242424242', cvc: '123' },
  } as const
  const events: EngineEvent[] = [
    { type: 'action_started', action, surface: 'none' },
    {
      type: 'action_finished',
      action,
      evidence: { via: 'sdk_callback', actionId: action.id, payload: action.params },
    },
    { type: 'error', error: { code: 'secret', message: 'secret', detail: action.params } },
  ]
  expect(events.map(toCheckoutTelemetryEvent)).toEqual([
    { type: 'action_started', actionKind: 'sdk_handoff', surface: 'none' },
    { type: 'action_finished', actionKind: 'sdk_handoff', via: 'sdk_callback' },
    { type: 'error' },
  ])
})

it('does not forward unknown categorical values from a malformed provider', () => {
  const event = { type: 'result', result: { status: 'secret' } } as unknown as EngineEvent
  expect(JSON.stringify(toCheckoutTelemetryEvent(event))).toBe('{"type":"result"}')
})

it('subscribes to the engine and stops reporting after unsubscribe', async () => {
  const { provider } = createFakeProvider({ capabilities: { actions: [], surfaces: [] } })
  const engine = createCheckout({
    providers: [{ id: 'fake', config: {}, load: async () => ({ default: provider }) }],
    runners: createRunnerRegistry(),
    returnUrl: 'https://shop.test/return',
  })
  const report = vi.fn()
  const stop = observeCheckout(engine, report)
  await engine.useProvider('fake')
  expect(report).toHaveBeenCalled()
  report.mockClear()
  stop()
  await engine.useProvider('fake')
  expect(report).not.toHaveBeenCalled()
})
