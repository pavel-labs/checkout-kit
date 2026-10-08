import { createServer, type IncomingMessage, type Server } from 'node:http'
import { createHash, randomUUID } from 'node:crypto'
import { hmacValidator } from '@adyen/api-library'
import type { AdyenPayment } from '@checkout-kit/provider-adyen'
import type { Gateways, MerchantPayment, Protocol } from './gateways'

const plans = {
  '1id': { amount: 2500, currency: 'USD' },
  '2id': { amount: 12500, currency: 'USD' },
}
class RequestError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const readBody = async (req: IncomingMessage): Promise<Record<string, unknown>> => {
  if (!req.headers['content-type']?.startsWith('application/json'))
    throw new RequestError(415, 'Send application/json.')
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk)
    size += buffer.length
    if (size > 32_768) throw new RequestError(413, 'Request body is too large.')
    chunks.push(buffer)
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!isRecord(body)) throw new Error('not an object')
    return body
  } catch {
    throw new RequestError(400, 'Send a JSON object.')
  }
}
export interface PaymentServerOptions {
  readonly gateways: Gateways
  readonly origin: string
  readonly returnUrl: string
  readonly mock?: boolean
  readonly adyenHmacKey?: string
  readonly adyenMerchantAccount?: string
}
export const createPaymentServer = (options: PaymentServerOptions): Server => {
  const records = new Map<string, MerchantPayment>()
  const requests = new Map<string, { fingerprint: string; result?: Promise<unknown> }>()
  const confirmationKeys = new Map<string, string>()
  const recordKey = (protocol: Protocol, id: string) => `${protocol}:${id}`
  const replay = async (
    owner: string,
    method: string,
    path: string,
    key: string,
    body: Record<string, unknown>,
    run: (providerKey: string) => Promise<unknown>,
  ): Promise<unknown> => {
    const cacheKey = `${owner}:${method}:${path}:${key}`
    const fingerprint = JSON.stringify(body)
    const existing = requests.get(cacheKey)
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new RequestError(409, 'This idempotency key was used with different parameters.')
      if (existing.result) return existing.result
    }
    const entry = existing ?? { fingerprint }
    const providerKey = createHash('sha256').update(cacheKey).digest('hex')
    const result = run(providerKey).catch((cause: unknown) => {
      entry.result = undefined
      throw cause
    })
    entry.result = result
    requests.set(cacheKey, entry)
    return result
  }
  const update = async (record: MerchantPayment, request: Promise<MerchantPayment['dto']>) => {
    const webhookTime = record.webhookTime
    const dto = await request
    // A verified webhook received during an SDK call wins over that call's older reply.
    if (record.webhookTime === webhookTime) record.dto = dto
    return record.dto
  }
  return createServer(async (req, res) => {
    const json = (status: number, body?: unknown): void => {
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': options.origin,
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type, idempotency-key',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        vary: 'Origin',
        'cache-control': 'no-store',
      })
      res.end(body === undefined ? undefined : JSON.stringify(body))
    }
    try {
      const path = new URL(req.url ?? '/', options.origin).pathname
      if (path === '/adyen/webhooks' && req.method === 'POST') {
        if (!options.adyenHmacKey || !options.adyenMerchantAccount)
          throw new RequestError(503, 'Configure the Adyen webhook HMAC key and merchant account.')
        const body = await readBody(req)
        if (!Array.isArray(body.notificationItems) || !body.notificationItems.length)
          throw new RequestError(400, 'Missing notificationItems.')
        const validator = new hmacValidator()
        const items = body.notificationItems.map((entry: unknown) =>
          isRecord(entry) ? entry.NotificationRequestItem : null,
        )
        for (const item of items) {
          let verified = false
          try {
            verified =
              isRecord(item) &&
              item.merchantAccountCode === options.adyenMerchantAccount &&
              validator.validateHMAC(
                item as unknown as Parameters<typeof validator.validateHMAC>[0],
                options.adyenHmacKey,
              )
          } catch {
            // Malformed notifications are rejected just like invalid signatures.
          }
          if (!verified) throw new RequestError(401, 'Invalid webhook signature.')
        }
        for (const item of items) {
          if (!isRecord(item)) continue
          const record = records.get(recordKey('adyen', String(item.merchantReference)))
          if (
            !record ||
            !isRecord(item.amount) ||
            item.amount.value !== record.amount ||
            item.amount.currency !== record.currency
          )
            continue
          const time = Date.parse(String(item.eventDate))
          if (!Number.isFinite(time) || time < (record.webhookTime ?? 0)) continue
          if (item.eventCode === 'AUTHORISATION')
            record.dto = {
              ...(record.dto as AdyenPayment),
              action: null,
              resultCode: item.success === 'true' ? 'Authorised' : 'Refused',
            }
          else if (item.eventCode === 'CANCELLATION' && item.success === 'true')
            record.dto = { ...(record.dto as AdyenPayment), action: null, resultCode: 'Cancelled' }
          else continue
          record.webhookTime = time
        }
        return json(200, { accepted: true })
      }
      if (req.headers.origin && req.headers.origin !== options.origin)
        throw new RequestError(403, 'Origin is not allowed.')
      if (req.method === 'OPTIONS') return json(204)
      if (path === '/health' && req.method === 'GET')
        return json(200, {
          mode: options.mock ? 'mock' : 'sandbox',
          providers: Object.keys(options.gateways),
        })
      const ownerCookie = req.headers.cookie?.match(
        /(?:^|;\s*)checkout_session=([a-f0-9-]{36})(?:;|$)/,
      )?.[1]
      const owner = ownerCookie ?? randomUUID()
      if (!ownerCookie)
        res.setHeader('set-cookie', `checkout_session=${owner}; Path=/; HttpOnly; SameSite=Lax`)
      const mockMatch = options.mock ? path.match(/^\/mock\/(stripe|adyen|paypal)\/([^/]+)$/) : null
      if (mockMatch) {
        const protocol = mockMatch[1] as Protocol
        const record = records.get(recordKey(protocol, mockMatch[2]))
        if (!record || record.owner !== owner) throw new RequestError(404, 'Payment not found.')
        if (req.method === 'GET') {
          res.writeHead(200, {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
          })
          return res.end(
            '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Simulated payment provider</title><style>body{font:18px system-ui;max-width:440px;margin:15vh auto;padding:24px}button{padding:12px 20px;margin:8px}</style><h1>Simulated approval</h1><p>This is a local protocol simulator. No payment provider is contacted.</p><form method="post"><button name="outcome" value="approve">Approve</button><button name="outcome" value="decline">Decline</button></form></html>',
          )
        }
        if (req.method !== 'POST') throw new RequestError(405, 'Method is not allowed.')
        let raw = ''
        for await (const chunk of req) {
          raw += String(chunk)
          if (raw.length > 1024) throw new RequestError(413, 'Request body is too large.')
        }
        const accepted = new URLSearchParams(raw).get('outcome') === 'approve'
        const gateway = options.gateways[protocol]
        if (!gateway?.approve) throw new RequestError(404, 'Mock approval is unavailable.')
        record.dto = await gateway.approve(record, accepted)
        const url = new URL(record.returnUrl)
        if (protocol === 'paypal') url.searchParams.set('token', record.dto.id)
        if (protocol === 'adyen') url.searchParams.set('redirectResult', record.dto.id)
        res.writeHead(303, { location: url.toString() })
        return res.end()
      }
      const match = path.match(
        /^\/(stripe|adyen|paypal)\/(payments|orders)(?:\/([^/]+))?(?:\/(confirm|capture|details|cancel))?$/,
      )
      if (!match) throw new RequestError(404, 'Route not found.')
      const protocol = match[1] as Protocol
      const gateway = options.gateways[protocol]
      if (!gateway)
        throw new RequestError(503, `${protocol} sandbox credentials are not configured.`)
      const id = match[3] ? decodeURIComponent(match[3]) : undefined
      const create =
        req.method === 'POST' &&
        ((!id && !match[4]) || (protocol === 'adyen' && id === 'sessions' && !match[4]))
      if (
        (protocol === 'paypal' && match[2] !== 'orders') ||
        (protocol !== 'paypal' && match[2] !== 'payments')
      )
        throw new RequestError(404, 'Route not found.')
      if (create) {
        const body = await readBody(req)
        if (typeof body.planId !== 'string' || !Object.hasOwn(plans, body.planId))
          throw new RequestError(422, 'Unknown plan.')
        const price = plans[body.planId as keyof typeof plans]
        const key = req.headers['idempotency-key']
        if (typeof key !== 'string' || !key.trim() || key.length > 200)
          throw new RequestError(400, 'Provide an Idempotency-Key (1–200 characters).')
        const response = await replay(owner, 'POST', path, key, body, async (providerKey) => {
          const input = { ...price, owner, returnUrl: options.returnUrl }
          const dto = await gateway.create(input, providerKey)
          if (!dto.id) throw new Error('Provider did not return an id.')
          records.set(recordKey(protocol, dto.id), { ...input, protocol, dto })
          return dto
        })
        return json(201, response)
      }
      const record = id ? records.get(recordKey(protocol, id)) : undefined
      if (!record || record.owner !== owner) throw new RequestError(404, 'Payment not found.')
      if (req.method === 'GET' && !match[4]) {
        await update(record, gateway.get(record))
        return json(200, record.dto)
      }
      if (req.method !== 'POST') throw new RequestError(405, 'Method is not allowed.')
      const operation = match[4] ?? (protocol === 'adyen' ? 'confirm' : '')
      const execute =
        operation === 'details'
          ? gateway.details
          : operation === 'cancel'
            ? gateway.cancel
            : operation === 'confirm' || operation === 'capture'
              ? gateway.confirm
              : undefined
      if (!execute) throw new RequestError(404, 'Operation is not supported.')
      const body = await readBody(req)
      const key = req.headers['idempotency-key']
      if (typeof key !== 'string' || !key.trim() || key.length > 200)
        throw new RequestError(400, 'Provide an Idempotency-Key (1–200 characters).')
      if (operation === 'confirm') {
        if (
          protocol === 'stripe' &&
          (typeof body.paymentMethodId !== 'string' || !body.paymentMethodId.trim())
        )
          throw new RequestError(422, 'Provide a Stripe PaymentMethod id.')
        if (protocol === 'adyen') {
          if (!isRecord(body.paymentMethod))
            throw new RequestError(422, 'Provide an Adyen paymentMethod.')
          const previous = confirmationKeys.get(recordKey(protocol, record.dto.id))
          if (previous && previous !== key)
            throw new RequestError(
              409,
              'Reconcile this payment or retry its original confirmation key.',
            )
          confirmationKeys.set(recordKey(protocol, record.dto.id), key)
        }
      }
      const response = await replay(owner, 'POST', path, key, body, async (providerKey) => {
        return update(
          record,
          operation === 'cancel'
            ? gateway.cancel!(record, providerKey)
            : (execute as NonNullable<typeof gateway.confirm>)(record, body, providerKey),
        )
      })
      json(200, response)
    } catch (cause) {
      if (!res.writableEnded)
        json(cause instanceof RequestError ? cause.status : 502, {
          message:
            cause instanceof RequestError
              ? cause.message
              : 'The provider request failed. Check the payment status before retrying.',
        })
    }
  })
}
