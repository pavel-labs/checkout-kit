import { createPaymentServer } from './app'
import { createSandboxGateways } from './gateways'
import { createMockGateways } from './mock'

const port = Number(process.env.PORT ?? 4000)
const host = process.env.CHECKOUT_HOST ?? '127.0.0.1'
const origin = process.env.CHECKOUT_ORIGIN ?? 'http://localhost:5173'
const returnUrl = process.env.CHECKOUT_RETURN_URL ?? `${origin}/payment/return`
const mock = process.argv.includes('--mock')
const mockOrigin = `http://localhost:${port}`
const server = createPaymentServer({
  gateways: mock ? createMockGateways(mockOrigin) : createSandboxGateways(process.env),
  origin,
  returnUrl,
  mock,
  mockOrigin: mock ? mockOrigin : undefined,
  adyenHmacKey: process.env.ADYEN_HMAC_KEY,
  adyenMerchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
})
server.listen(port, host, () =>
  console.log(
    `${mock ? 'Protocol simulator' : 'Sandbox payment API'} listening on http://${host}:${port}`,
  ),
)
