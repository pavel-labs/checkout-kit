import { describe, expect, it } from 'vitest'
import { parseBridgeCommand, parseBridgeEvent } from './index'

const envelope = (type: string, payload: unknown, extra: object = {}) => ({
  source: 'checkout-kit',
  v: 1,
  id: 'id',
  sessionId: 'session',
  ts: 1,
  type,
  payload,
  ...extra,
})

describe('bridge payload validation', () => {
  it.each([
    ['PAYMENT_SUCCEEDED', { intentId: 'pi', amount: -1, currency: 'USD' }],
    ['PAYMENT_SUCCEEDED', { intentId: 'pi', amount: 1.5, currency: 'USD' }],
    ['PAYMENT_SUCCEEDED', { intentId: 'pi', amount: 100, currency: 'US' }],
    ['PAYMENT_READY', {}],
    ['PAYMENT_HEIGHT_CHANGED', { height: Infinity }],
    ['PAYMENT_STATE_CHANGED', { phase: 'succeeded', state: 'failure', previousPhase: null }],
    ['PAYMENT_DECLINED', { intentId: 'pi', message: 1 }],
    ['UNRECOGNIZED_EVENT', {}],
    ['PAYMENT_SUCCEEDED', []],
  ])('rejects malformed event %s', (type, payload) => {
    expect(parseBridgeEvent(envelope(type, payload))).toEqual({ ok: false, reason: 'malformed' })
  })

  it.each([
    ['PAYMENT_SET_THEME', { theme: 'arbitrary' }],
    ['PAYMENT_RESUME', { params: [] }],
    ['PAYMENT_RESUME', { params: { intentId: 42 } }],
    ['PAYMENT_CANCEL', { params: {} }],
    ['PAYMENT_READY', {}],
  ])('rejects malformed command %s', (type, payload) => {
    expect(parseBridgeCommand(envelope(type, payload))).toEqual({ ok: false, reason: 'malformed' })
  })

  it.each([{ id: '' }, { sessionId: '' }, { ts: NaN }, { ts: -1 }])(
    'checks required envelope fields: %j',
    (extra) => {
      expect(parseBridgeCommand(envelope('PAYMENT_CANCEL', {}, extra))).toEqual({
        ok: false,
        reason: 'malformed',
      })
    },
  )

  it.each([0, 2])('rejects incompatible protocol version %s', (v) => {
    expect(parseBridgeCommand(envelope('PAYMENT_CANCEL', {}, { v }))).toEqual({
      ok: false,
      reason: 'unsupported_version',
    })
  })
})
