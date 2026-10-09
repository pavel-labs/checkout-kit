import { afterEach, expect, it, vi } from 'vitest'
import type { PaymentAction, RunnerContext } from '@checkout-kit/core'
import { validateMessageOrigin, validatePaymentUrl } from './security'
import { createBrowserRuntime } from './create-browser-runtime'
import { createRedirectRunner } from './runners/redirect'
import { createCollectFieldsRunner } from './runners/collect-fields'
import { createSdkHandoffRunner } from './runners/sdk-handoff'
import { createDisplayRunner } from './runners/display'

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

it.each([
  'javascript:alert(1)',
  'data:text/html,test',
  'file:///etc/passwd',
  'http://bank.test/pay',
  'https://user:password@bank.test/pay',
])('blocks unsafe payment addresses: %s', (value) => {
  expect(() => validatePaymentUrl(value, 'https://shop.test/', 'redirect')).toThrow()
})
it('allows only explicit loopback HTTP development origins', () => {
  const policy = { allowInsecureLocalhost: true }
  expect(
    validatePaymentUrl('http://127.0.0.1:4000/pay', 'https://shop.test/', 'redirect', policy)
      .origin,
  ).toBe('http://127.0.0.1:4000')
  expect(() =>
    validatePaymentUrl('http://localhost.evil.test/pay', 'https://shop.test/', 'redirect', policy),
  ).toThrow()
  expect(() =>
    validatePaymentUrl('http://127.0.0.1:4000/pay', 'https://shop.test/', 'redirect'),
  ).toThrow()
})
it('requires exact SDK origins and does not accept suffixes or protocol-relative bypasses', () => {
  const policy = { scriptOrigins: ['https://sdk.bank.test'] }
  expect(
    validatePaymentUrl('https://sdk.bank.test/sdk.js', 'https://shop.test/', 'script', policy)
      .origin,
  ).toBe('https://sdk.bank.test')
  for (const url of [
    'https://sdk.bank.test.evil.test/sdk.js',
    '//evil.test/sdk.js',
    'https://sdk.bank.test@evil.test/sdk.js',
  ])
    expect(() => validatePaymentUrl(url, 'https://shop.test/', 'script', policy)).toThrow()
  expect(() =>
    validatePaymentUrl('https://sdk.bank.test/sdk.js', 'https://shop.test/', 'script'),
  ).toThrow()
})
it.each(['*', 'null', 'https://bank.test/path', 'https://bank.test/'])(
  'rejects non-canonical message origins: %s',
  (origin) => {
    expect(() => validateMessageOrigin(origin)).toThrow()
  },
)
it('requires explicit custom bank protocols and never permits script/data schemes', () => {
  expect(() => validatePaymentUrl('bankapp://pay/1', 'https://shop.test/', 'deeplink')).toThrow()
  expect(
    validatePaymentUrl('bankapp://pay/1', 'https://shop.test/', 'deeplink', {
      deeplinkProtocols: ['bankapp:'],
    }).protocol,
  ).toBe('bankapp:')
  expect(() =>
    validatePaymentUrl('javascript:alert(1)', 'https://shop.test/', 'deeplink', {
      deeplinkProtocols: ['javascript:'],
    }),
  ).toThrow()
  expect(() =>
    validatePaymentUrl('http://bank.test/pay', 'https://shop.test/', 'deeplink', {
      deeplinkProtocols: ['http:'],
    }),
  ).toThrow()
})
it('does not put a rejected URL or its credentials in an error message', () => {
  try {
    validatePaymentUrl(
      'https://user:secret@bank.test/pay?token=secret',
      'https://shop.test/',
      'redirect',
    )
  } catch (cause) {
    expect(String(cause)).not.toContain('secret')
  }
})
it('rejects a foreign return URL before constructing a runtime', () => {
  expect(() =>
    createBrowserRuntime({
      returnPath: 'https://evil.test/return',
      security: { allowInsecureLocalhost: true },
    }),
  ).toThrow('application origin')
})

const context = (): RunnerContext => {
  const mount = document.createElement('div')
  document.body.append(mount)
  return {
    surface: 'inline',
    mount: { element: mount, release: () => mount.replaceChildren() },
    signal: new AbortController().signal,
    returnUrl: 'https://shop.test/return',
    deadline: Date.now() + 100,
    report() {},
  }
}
it('rejects a redirect before submitting or mounting a frame', async () => {
  const ctx = context()
  const submit = vi.spyOn(HTMLFormElement.prototype, 'submit')
  const action = {
    id: 'a',
    kind: 'redirect',
    surface: 'iframe',
    purpose: 'authenticate',
    url: 'javascript:alert(1)',
    method: 'POST',
    completion: { via: 'post_message', origin: 'https://bank.test', type: 'done' },
  } as const
  await expect(
    createRedirectRunner().run(action, { ...ctx, surface: 'iframe' }),
  ).resolves.toMatchObject({ via: 'aborted', reason: 'runner_error' })
  expect(submit).not.toHaveBeenCalled()
  expect(document.querySelector('iframe')).toBeNull()
})
it('rejects hosted fields whose frame and message origins differ before mounting', async () => {
  const action = {
    id: 'a',
    kind: 'collect_fields',
    surface: 'inline',
    purpose: 'collect',
    url: 'https://evil.test/fields',
    origin: 'https://bank.test',
    fields: ['number'],
    completion: { via: 'post_message', origin: 'https://bank.test', type: 'token' },
  } as const
  await expect(createCollectFieldsRunner().run(action, context())).resolves.toMatchObject({
    via: 'aborted',
    reason: 'runner_error',
  })
  expect(document.querySelector('iframe')).toBeNull()
})
it('rejects unlisted scripts before loading code or invoking an SDK', async () => {
  const request = vi.fn()
  const append = vi.spyOn(document.head, 'append')
  const action = {
    id: 'a',
    kind: 'sdk_handoff',
    surface: 'none',
    purpose: 'authorize',
    sdk: 'wallet',
    scriptUrl: 'https://evil.test/sdk.js',
    params: {},
    completion: { via: 'sdk_callback' },
  } as const
  await expect(
    createSdkHandoffRunner({ adapters: [{ sdk: 'wallet', request }] }).run(action, {
      ...context(),
      surface: 'none',
    }),
  ).resolves.toMatchObject({ via: 'aborted', reason: 'runner_error' })
  expect(append).not.toHaveBeenCalled()
  expect(request).not.toHaveBeenCalled()
})
it('rejects an unsafe display link before placing it in the DOM', async () => {
  const action: Extract<PaymentAction, { kind: 'display' }> = {
    id: 'a',
    kind: 'display',
    surface: 'inline',
    purpose: 'authorize',
    format: 'code',
    value: '123',
    deeplink: 'javascript:alert(1)',
    completion: { via: 'poll', intervalMs: 100, timeoutMs: 100 },
  }
  await expect(createDisplayRunner().run(action, context())).resolves.toMatchObject({
    via: 'aborted',
    reason: 'runner_error',
  })
  expect(document.querySelector('a')).toBeNull()
})
