import { describe, expect, it, vi } from 'vitest'
import { BRIDGE_VERSION } from '../protocol'
import {
  createBridgeCommand,
  createCommandScript,
  createCheckoutMessageHandler,
  createNavigationPolicy,
  parseReturnDeepLink,
} from './index'

const envelope = (type: string, payload: object = {}, overrides: object = {}) =>
  JSON.stringify({
    source: 'checkout-kit',
    v: BRIDGE_VERSION,
    id: 'msg_1',
    sessionId: 'sess_1',
    ts: Date.now(),
    type,
    payload,
    ...overrides,
  })

describe('createCheckoutMessageHandler', () => {
  it('routes an event to the handler for its type', () => {
    const succeeded = vi.fn()
    const handle = createCheckoutMessageHandler({ PAYMENT_SUCCEEDED: succeeded })

    handle(envelope('PAYMENT_SUCCEEDED', { intentId: 'pi_1', amount: 2500, currency: 'USD' }))

    expect(succeeded).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { intentId: 'pi_1', amount: 2500, currency: 'USD' } }),
    )
  })

  it('ignores the other traffic a WebView carries', () => {
    const onEvent = vi.fn()
    const onUnknown = vi.fn()
    const handle = createCheckoutMessageHandler({ onEvent, onUnknown })

    handle(JSON.stringify({ type: 'PAYMENT_SUCCEEDED' }))
    handle('a plain string from some other script')
    handle(null)

    expect(onEvent).not.toHaveBeenCalled()
    expect(onUnknown).toHaveBeenCalledTimes(3)
    expect(onUnknown).toHaveBeenCalledWith('not_ours', expect.anything())
  })

  it('refuses a version it does not understand instead of guessing', () => {
    const onUnknown = vi.fn()
    const handle = createCheckoutMessageHandler({ onUnknown })

    handle(envelope('PAYMENT_SUCCEEDED', {}, { v: BRIDGE_VERSION + 1 }))

    expect(onUnknown).toHaveBeenCalledWith('unsupported_version', expect.anything())
  })

  it('remembers the session, so a reloaded WebView can be told apart', () => {
    const handle = createCheckoutMessageHandler({})

    handle(
      envelope(
        'PAYMENT_READY',
        { bridgeVersion: 1, providerId: null, instruments: [], actions: [] },
        { sessionId: 'sess_2' },
      ),
    )

    expect(handle.sessionId).toBe('sess_2')
  })
})

describe('createNavigationPolicy', () => {
  const policy = createNavigationPolicy({
    allow: ['https://pay.example.com/checkout'],
    openExternally: ['https://help.example.com'],
    returnScheme: 'myapp',
  })

  it('allows the checkout it was given', () => {
    expect(policy.decide('https://pay.example.com/checkout/card')).toBe('allow')
  })

  it('blocks another path on the same host', () => {
    expect(policy.decide('https://pay.example.com/admin')).toBe('block')
  })

  it('compares the origin exactly', () => {
    // The classic bypass: the allowed URL is in the fragment, not the origin.
    expect(policy.decide('https://evil.test/#https://pay.example.com/checkout')).toBe('block')
    expect(policy.decide('https://pay.example.com.evil.test/checkout')).toBe('block')
  })

  it('never allows plain http', () => {
    expect(policy.decide('http://pay.example.com/checkout')).toBe('block')
  })

  it('sends a return deep link back to the app', () => {
    expect(policy.decide('myapp://payment/return?intentId=pi_1')).toBe('return')
  })

  it('sends mail and phone links outside', () => {
    expect(policy.decide('mailto:support@example.com')).toBe('external')
    expect(policy.decide('https://help.example.com/cards')).toBe('external')
  })

  it('blocks anything it cannot even parse', () => {
    expect(policy.decide('javascript:alert(1)')).toBe('block')
    expect(policy.decide('not a url')).toBe('block')
  })
})

describe('parseReturnDeepLink', () => {
  it('reads the query the provider sent back', () => {
    const params = parseReturnDeepLink('myapp://payment/return?intentId=pi_1&status=ok', {
      scheme: 'myapp',
      path: 'payment/return',
    })

    expect(params).toEqual({ intentId: 'pi_1', status: 'ok' })
  })

  it('ignores a link for something else in the app', () => {
    expect(
      parseReturnDeepLink('myapp://orders/12', { scheme: 'myapp', path: 'payment/return' }),
    ).toBeNull()
    expect(parseReturnDeepLink('https://example.com/return', { scheme: 'myapp' })).toBeNull()
  })
})

describe('trimming the path', () => {
  it('is not fooled by extra slashes on either side', () => {
    const params = parseReturnDeepLink('myapp://payment/return/?intentId=pi_1', {
      scheme: 'myapp',
      path: '/payment/return/',
    })

    expect(params).toEqual({ intentId: 'pi_1' })
  })

  it('stays linear on a long run of slashes', () => {
    // The obvious `/^\/+|\/+$/` here is quadratic, and the input is a URL from outside.
    const started = Date.now()
    parseReturnDeepLink(`myapp://${'/'.repeat(50_000)}x`, { scheme: 'myapp', path: 'nope' })

    expect(Date.now() - started).toBeLessThan(1000)
  })
})

describe('session routing', () => {
  const ready = { bridgeVersion: 1, providerId: null, instruments: [], actions: [] }
  const paid = { intentId: 'pi', amount: 2500, currency: 'USD' }
  it('ignores duplicate events and messages from a retired document', () => {
    const onEvent = vi.fn()
    const handle = createCheckoutMessageHandler({ onEvent })
    handle(envelope('PAYMENT_READY', ready, { id: 'ready1' }))
    handle(envelope('PAYMENT_READY', ready, { id: 'ready1' }))
    handle(envelope('PAYMENT_READY', ready, { sessionId: 'sess_2', id: 'ready2' }))
    handle(envelope('PAYMENT_SUCCEEDED', paid, { id: 'old-payment' }))
    handle(envelope('PAYMENT_READY', ready, { id: 'old-ready' }))
    expect(handle.sessionId).toBe('sess_2')
    expect(onEvent).toHaveBeenCalledTimes(2)
  })

  it('requires a new handshake before a different session can take over', () => {
    const onEvent = vi.fn()
    const handle = createCheckoutMessageHandler({ onEvent })
    handle(envelope('PAYMENT_READY', ready))
    handle(envelope('PAYMENT_SUCCEEDED', paid, { sessionId: 'unknown', id: 'foreign' }))
    expect(handle.sessionId).toBe('sess_1')
    expect(onEvent).toHaveBeenCalledTimes(1)
  })

  it('does not treat a similarly named path as an allowed directory', () => {
    const policy = createNavigationPolicy({ allow: ['https://shop.test/checkout/'] })
    expect(policy.decide('https://shop.test/checkout')).toBe('allow')
    expect(policy.decide('https://shop.test/checkout/card')).toBe('allow')
    expect(policy.decide('https://shop.test/checkout-admin')).toBe('block')
    expect(policy.decide('https://user:password@shop.test/checkout')).toBe('block')
  })
})

describe('native command scripts', () => {
  it('round-trips arbitrary return parameters as data', () => {
    const command = createBridgeCommand(
      'PAYMENT_RESUME',
      { params: { token: "'); globalThis.compromised = true; // </script> \u2028" } },
      { sessionId: 'session', id: 'command' },
    )
    const dispatchEvent = vi.fn()
    const Message = class {
      readonly type: string
      readonly options: { data: string }
      constructor(type: string, options: { data: string }) {
        this.type = type
        this.options = options
      }
    }
    const script = createCommandScript(command)
    new Function('globalThis', 'MessageEvent', script)({ dispatchEvent }, Message)
    expect(JSON.parse(dispatchEvent.mock.calls[0]![0].options.data)).toEqual(command)
    expect(script).not.toContain('</script>')
    expect((globalThis as Record<string, unknown>).compromised).toBeUndefined()
  })
})
