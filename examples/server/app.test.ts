import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import type { Server } from 'node:http'
import { hmacValidator } from '@adyen/api-library'
import { createPaymentServer } from './app'
import { createMockGateways } from './mock'
import { captureStatus, createSandboxGateways, type Gateways } from './gateways'
import type { Order } from '@paypal/paypal-server-sdk'

const servers: Server[] = []
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((cause) => (cause ? reject(cause) : resolve()))
          server.closeAllConnections()
        }),
    ),
  )
})
const start = async (gateways?: Gateways, extras = {}) => {
  const mock = createMockGateways('http://localhost:4000')
  const server = createPaymentServer({
    gateways: gateways ?? mock,
    origin: 'http://localhost:5173',
    returnUrl: 'http://localhost:5173/payment/return',
    mock: true,
    ...extras,
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No server port')
  const root = `http://127.0.0.1:${address.port}`
  const owner = `checkout_session=${randomUUID()}`
  const request = (path: string, options: RequestInit = {}) =>
    fetch(`${root}${path}`, {
      ...options,
      headers: { cookie: owner, ...options.headers },
    })
  const post = (path: string, body: unknown, key: string = randomUUID()) =>
    request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify(body),
    })
  return { root, request, post }
}

describe('merchant HTTP boundary', () => {
  it.each([
    ['/stripe/payments', 'status', 'requires_payment_method'],
    ['/adyen/payments/sessions', 'resultCode', 'Created'],
    ['/paypal/orders', 'status', 'CREATED'],
  ])('serves the published adapter route %s and owns its price', async (path, field, status) => {
    const { post } = await start()
    const response = await post(path, {
      planId: '1id',
      amount: 1,
      currency: 'EUR',
      returnUrl: 'https://evil.test',
    })
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ amount: 2500, currency: 'USD', [field]: status })
  })

  it('isolates payments and idempotency keys between browser sessions', async () => {
    const { root, post, request } = await start()
    const response = await post('/stripe/payments', { planId: '1id' }, 'same-key')
    const dto = (await response.json()) as { id: string }
    expect((await request(`/stripe/payments/${dto.id}`)).status).toBe(200)
    expect((await fetch(`${root}/stripe/payments/${dto.id}`)).status).toBe(404)
    const other = await fetch(`${root}/stripe/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'same-key' },
      body: JSON.stringify({ planId: '1id' }),
    })
    expect(other.headers.get('set-cookie')).toContain('HttpOnly; SameSite=Lax')
    expect(((await other.json()) as { id: string }).id).not.toBe(dto.id)
  })

  it('replays concurrent identical requests and rejects a changed order', async () => {
    const create = vi.fn(createMockGateways('http://localhost:4000').stripe!.create)
    const { post } = await start({
      stripe: { ...createMockGateways('http://localhost:4000').stripe!, create },
    })
    const responses = await Promise.all([
      post('/stripe/payments', { planId: '1id' }, 'attempt'),
      post('/stripe/payments', { planId: '1id' }, 'attempt'),
    ])
    expect(await responses[0].json()).toEqual(await responses[1].json())
    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][1]).toMatch(/^[a-f0-9]{64}$/)
    expect((await post('/stripe/payments', { planId: '2id' }, 'attempt')).status).toBe(409)
  })

  it('keeps operation keys separate and retries an interrupted provider request', async () => {
    const mock = createMockGateways('http://localhost:4000').stripe!
    const create = vi.fn(mock.create).mockRejectedValueOnce(new Error('secret sk_test_hidden'))
    const confirm = vi.fn(mock.confirm!)
    const { post } = await start({ stripe: { ...mock, create, confirm } })
    const failed = await post('/stripe/payments', { planId: '1id' }, 'retry')
    expect(failed.status).toBe(502)
    expect(await failed.text()).not.toContain('sk_test_hidden')
    expect((await post('/stripe/payments', { planId: '2id' }, 'retry')).status).toBe(409)
    const response = await post('/stripe/payments', { planId: '1id' }, 'retry')
    const { id } = (await response.json()) as { id: string }
    const confirmed = await post(
      `/stripe/payments/${id}/confirm`,
      { paymentMethodId: 'pm_mock_approve' },
      'retry',
    )
    expect(await confirmed.json()).toMatchObject({ status: 'succeeded' })
    expect(create).toHaveBeenCalledTimes(2)
    expect(confirm.mock.calls[0][2]).not.toBe(create.mock.calls[1][1])
  })

  it('rejects malformed requests, unknown plans, missing keys and foreign origins', async () => {
    const { post, request } = await start()
    expect((await post('/stripe/payments', { planId: '__proto__' })).status).toBe(422)
    expect((await post('/stripe/payments', { planId: 'unknown' })).status).toBe(422)
    expect(
      (
        await request('/stripe/payments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"planId":"1id"}',
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await request('/stripe/payments', {
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: '{}',
        })
      ).status,
    ).toBe(415)
    expect(
      (
        await request('/stripe/payments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{',
        })
      ).status,
    ).toBe(400)
    expect(
      (await post('/stripe/payments', { planId: '1id', padding: 'x'.repeat(40_000) })).status,
    ).toBe(413)
    expect(
      (await request('/stripe/payments', { headers: { origin: 'https://evil.test' } })).status,
    ).toBe(403)
    const preflight = await request('/stripe/payments', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:5173' },
    })
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('only exposes approval pages in explicit simulation mode', async () => {
    const { post, request } = await start(undefined, { mock: false })
    const { id } = (await (await post('/paypal/orders', { planId: '1id' })).json()) as {
      id: string
    }
    expect((await request(`/mock/paypal/${id}`)).status).toBe(404)
    expect(await (await request('/health')).json()).toMatchObject({ mode: 'sandbox' })
  })

  it('does not capture PayPal before approval, then replays the capture', async () => {
    const { post, request } = await start()
    const { id } = (await (await post('/paypal/orders', { planId: '1id' })).json()) as {
      id: string
    }
    expect(await (await post(`/paypal/orders/${id}/capture`, {})).json()).toMatchObject({
      status: 'CREATED',
    })
    const approval = await request(`/mock/paypal/${id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'outcome=approve',
      redirect: 'manual',
    })
    expect(approval.status).toBe(303)
    expect(approval.headers.get('location')).toContain(`token=${id}`)
    const capture = () => post(`/paypal/orders/${id}/capture`, {}, 'capture-once')
    expect(await (await capture()).json()).toMatchObject({
      status: 'COMPLETED',
      captureStatus: 'COMPLETED',
    })
    expect(await (await capture()).json()).toMatchObject({
      status: 'COMPLETED',
      captureStatus: 'COMPLETED',
    })
  })

  it('binds Adyen confirmation to one key instead of submitting a second charge', async () => {
    const mock = createMockGateways('http://localhost:4000').adyen!
    const confirm = vi.fn(mock.confirm!)
    const { post } = await start({ adyen: { ...mock, confirm } })
    const { id } = (await (await post('/adyen/payments/sessions', { planId: '1id' })).json()) as {
      id: string
    }
    const body = { paymentMethod: { type: 'scheme', storedPaymentMethodId: 'pm_mock_approve' } }
    expect((await post(`/adyen/payments/${id}`, body, 'original')).status).toBe(200)
    expect((await post(`/adyen/payments/${id}`, body, 'original')).status).toBe(200)
    expect((await post(`/adyen/payments/${id}`, body, 'another-attempt')).status).toBe(409)
    expect(confirm).toHaveBeenCalledTimes(1)
  })
})

describe('Adyen verified webhook state', () => {
  const key = 'ab'.repeat(32)
  const notification = (id: string, changes = {}) => {
    const item = {
      merchantReference: id,
      merchantAccountCode: 'TEST',
      pspReference: 'psp123',
      originalReference: '',
      amount: { value: 2500, currency: 'USD' },
      eventCode: 'AUTHORISATION',
      success: 'true',
      eventDate: '2026-10-08T10:00:00Z',
      ...changes,
    }
    return {
      NotificationRequestItem: {
        ...item,
        additionalData: {
          hmacSignature: new hmacValidator().calculateHmac(
            item as unknown as Parameters<InstanceType<typeof hmacValidator>['calculateHmac']>[0],
            key,
          ),
        },
      },
    }
  }
  it('accepts signed matching prices, rejects tampering and ignores older events', async () => {
    // Use merchant-stored state rather than the simulator's automatic settlement.
    const mock = createMockGateways('http://localhost:4000').adyen!
    const { post, request } = await start(
      { adyen: { ...mock, get: async (record) => record.dto } },
      { adyenHmacKey: key, adyenMerchantAccount: 'TEST' },
    )
    const { id } = (await (await post('/adyen/payments/sessions', { planId: '1id' })).json()) as {
      id: string
    }
    const send = (item: unknown) => post('/adyen/webhooks', { notificationItems: [item] })
    const bad = notification(id)
    bad.NotificationRequestItem.amount.value = 1
    expect((await send(bad)).status).toBe(401)
    expect((await send({ NotificationRequestItem: {} })).status).toBe(401)
    expect((await send(notification(id, { amount: { value: 1, currency: 'USD' } }))).status).toBe(
      200,
    )
    expect(await (await request(`/adyen/payments/${id}`)).json()).toMatchObject({
      resultCode: 'Created',
    })
    expect((await send(notification(id))).status).toBe(200)
    expect(await (await request(`/adyen/payments/${id}`)).json()).toMatchObject({
      resultCode: 'Authorised',
    })
    await send(notification(id, { success: 'false', eventDate: '2026-10-08T09:00:00Z' }))
    expect(await (await request(`/adyen/payments/${id}`)).json()).toMatchObject({
      resultCode: 'Authorised',
    })
    expect((await send(notification(id, { merchantAccountCode: 'OTHER' }))).status).toBe(401)
  })
  it('retains a verified webhook when an older SDK reply arrives afterwards', async () => {
    const mock = createMockGateways('http://localhost:4000').adyen!
    let finish!: (value: Awaited<ReturnType<typeof mock.create>>) => void
    const confirm = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<typeof mock.create>>>((resolve) => {
          finish = resolve
        }),
    )
    const { post, request } = await start(
      { adyen: { ...mock, get: async (record) => record.dto, confirm } },
      { adyenHmacKey: key, adyenMerchantAccount: 'TEST' },
    )
    const { id } = (await (await post('/adyen/payments/sessions', { planId: '1id' })).json()) as {
      id: string
    }
    const pending = post(`/adyen/payments/${id}`, { paymentMethod: { type: 'scheme' } })
    await vi.waitFor(() => expect(confirm).toHaveBeenCalled())
    await post('/adyen/webhooks', { notificationItems: [notification(id)] })
    finish({ id, amount: 2500, currency: 'USD', resultCode: 'Pending' })
    expect(await (await pending).json()).toMatchObject({ resultCode: 'Authorised' })
    expect(await (await request(`/adyen/payments/${id}`)).json()).toMatchObject({
      resultCode: 'Authorised',
    })
  })
})

describe('sandbox DTOs', () => {
  const order = (captures: unknown[]): Order =>
    ({ purchaseUnits: [{ payments: { captures } }] }) as Order
  const completed = {
    id: 'cap1',
    status: 'COMPLETED',
    amount: { currencyCode: 'USD', value: '25.00' },
  }
  it('requires completed captures covering the exact merchant price', () => {
    expect(captureStatus(order([completed]), 2500, 'USD')).toBe('COMPLETED')
    expect(captureStatus(order([]), 2500, 'USD')).toBeUndefined()
    expect(captureStatus(order([{ ...completed, status: 'PENDING' }]), 2500, 'USD')).toBe('PENDING')
    expect(captureStatus(order([{ ...completed, status: 'DECLINED' }]), 2500, 'USD')).toBe('FAILED')
    expect(captureStatus(order([completed, completed]), 5000, 'USD')).toBe('FAILED')
    for (const amount of [
      { currencyCode: 'EUR', value: '25.00' },
      { currencyCode: 'USD', value: '24.00' },
      { currencyCode: 'USD', value: '25.001' },
    ])
      expect(captureStatus(order([{ ...completed, amount }]), 2500, 'USD')).toBe('FAILED')
  })
  it('starts without keys and refuses a Stripe live key', () => {
    expect(createSandboxGateways({})).toEqual({})
    expect(() => createSandboxGateways({ STRIPE_SECRET_KEY: 'sk_live_forbidden' })).toThrow(
      'test key',
    )
  })
})
