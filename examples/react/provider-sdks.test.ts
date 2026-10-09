import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const { createFromAction, unmount } = vi.hoisted(() => ({
  createFromAction: vi.fn(),
  unmount: vi.fn(),
}))
vi.mock('@adyen/adyen-web', () => ({ AdyenCheckout: async () => ({ createFromAction }) }))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_ADYEN_CLIENT_KEY', 'test_fixture')
  createFromAction.mockReset().mockReturnValue({ mount: () => ({ unmount }) })
  unmount.mockReset()
})
afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllEnvs()
})

it('keeps the full Adyen action and waits for additional details before resolving', async () => {
  const { adyenSdkAdapter } = await import('./provider-sdks')
  const action = {
    type: 'threeDS2',
    subtype: 'challenge',
    token: 'issued-3ds-token',
    paymentData: 'issued-data',
  }
  let settled = false
  const request = adyenSdkAdapter
    .request({ action }, new AbortController().signal)
    .then((value) => {
      settled = true
      return value
    })
  await vi.waitFor(() => expect(createFromAction).toHaveBeenCalled())
  expect(createFromAction.mock.calls[0][0]).toBe(action)
  expect(settled).toBe(false)
  expect(document.querySelector('dialog')).not.toBeNull()
  const data = { details: { threeDSResult: 'sdk-details' }, paymentData: 'issued-data' }
  createFromAction.mock.calls[0][1].onAdditionalDetails({ data })
  expect(await request).toEqual(data)
  expect(unmount).toHaveBeenCalledTimes(1)
  expect(document.querySelector('dialog')).toBeNull()
})
it('unmounts authentication on abort and does not open an already aborted action', async () => {
  const { adyenSdkAdapter } = await import('./provider-sdks')
  const controller = new AbortController()
  const request = adyenSdkAdapter.request({ action: { type: 'threeDS2' } }, controller.signal)
  const rejected = expect(request).rejects.toThrow('canceled')
  await vi.waitFor(() => expect(createFromAction).toHaveBeenCalled())
  controller.abort()
  await rejected
  expect(unmount).toHaveBeenCalledTimes(1)
  expect(document.querySelector('dialog')).toBeNull()
  createFromAction.mockClear()
  await expect(
    adyenSdkAdapter.request({ action: { type: 'threeDS2' } }, controller.signal),
  ).rejects.toThrow('canceled')
  expect(createFromAction).not.toHaveBeenCalled()
})
