import { describe, expect, it, vi } from 'vitest'
import { createHttpClient, HttpError } from './http-client'

describe('merchant HTTP client', () => {
  it('normalizes the API base URL and merges headers case-insensitively', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json({ id: 'pi_1' }))
    const client = createHttpClient({
      baseUrl: 'https://shop.test/api/',
      headers: { authorization: 'old', 'content-type': 'application/json' },
      credentials: 'include',
      fetch,
    })
    await client.post('/payments', { planId: 'starter' }, { headers: { Authorization: 'new' } })
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('https://shop.test/api/payments')
    expect(new Headers(options?.headers).get('Authorization')).toBe('new')
    expect(options?.credentials).toBe('include')
    expect(options?.body).toBe('{"planId":"starter"}')
  })
  it('preserves merchant error messages', async () => {
    const client = createHttpClient({
      baseUrl: '/api',
      fetch: async () => Response.json({ message: 'Order not found.' }, { status: 404 }),
    })
    await expect(client.get('/payments/missing')).rejects.toMatchObject({
      status: 404,
      message: 'Order not found.',
    })
  })
  it('returns HTTP errors for non-JSON responses', async () => {
    const client = createHttpClient({
      baseUrl: '/api',
      fetch: async () => new Response('upstream unavailable', { status: 503 }),
    })
    await expect(client.get('/payments')).rejects.toBeInstanceOf(HttpError)
  })
  it('preserves deliberate cancellation instead of reporting an offline error', async () => {
    const controller = new AbortController()
    controller.abort()
    const error = new DOMException('Aborted', 'AbortError')
    const client = createHttpClient({
      baseUrl: '/api',
      fetch: async () => {
        throw error
      },
    })
    await expect(client.get('/payments', { signal: controller.signal })).rejects.toBe(error)
  })
})
