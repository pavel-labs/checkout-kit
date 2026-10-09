import { expect, it } from 'vitest'
import {
  memoryStorage,
  PENDING_CHECKOUT_KEY,
  readPendingCheckout,
  writePendingCheckout,
  clearPendingCheckout,
} from './persistence'

it.each([
  {},
  { providerId: 'psp', intentId: 'pi', actionId: 'act' },
  { providerId: '', intentId: 'pi', actionId: 'act', idempotencyKey: 'key', startedAt: 0 },
])('rejects incomplete persisted records: %j', (record) => {
  const storage = memoryStorage()
  storage.write(PENDING_CHECKOUT_KEY, JSON.stringify(record))
  expect(readPendingCheckout(storage)).toBeNull()
})
it('tolerates a custom storage adapter becoming unavailable', () => {
  const fail = (): never => {
    throw new Error('disabled')
  }
  const storage = { read: fail, write: fail, remove: fail }
  expect(readPendingCheckout(storage)).toBeNull()
  expect(() =>
    writePendingCheckout(storage, {
      providerId: 'psp',
      intentId: 'pi',
      actionId: 'act',
      idempotencyKey: 'key',
      startedAt: 0,
    }),
  ).not.toThrow()
  expect(() => clearPendingCheckout(storage)).not.toThrow()
})

it('only reads and writes recovery identifiers even if a caller supplies extra properties', () => {
  const storage = memoryStorage()
  const pending = {
    providerId: 'stripe',
    intentId: 'pi',
    actionId: 'act',
    idempotencyKey: 'key',
    startedAt: 1,
  }
  const supplied = { ...pending, clientSecret: 'secret', card: { cvc: '123' } }
  writePendingCheckout(storage, supplied)
  expect(JSON.parse(storage.read(PENDING_CHECKOUT_KEY)!)).toEqual(pending)
  storage.write(PENDING_CHECKOUT_KEY, JSON.stringify(supplied))
  expect(readPendingCheckout(storage)).toEqual(pending)
})
