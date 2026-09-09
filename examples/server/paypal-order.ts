import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrdersController,
} from '@paypal/paypal-server-sdk'

let orders: OrdersController | undefined

const getOrders = (): OrdersController => {
  if (!orders) {
    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required on the server.')
    }

    orders = new OrdersController(
      new Client({
        clientCredentialsAuthCredentials: {
          oAuthClientId: clientId,
          oAuthClientSecret: clientSecret,
        },
        environment: Environment.Sandbox,
      }),
    )
  }
  return orders
}

export const createPayPalOrder = async (requestId: string, returnUrl: string) => {
  const response = await getOrders().createOrder({
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [{ amount: { currencyCode: 'USD', value: '19.99' } }],
      applicationContext: { returnUrl, cancelUrl: returnUrl },
    },
    paypalRequestId: requestId,
    prefer: 'return=representation',
  })

  return { id: response.result?.id, status: response.result?.status, links: response.result?.links }
}

export const capturePayPalOrder = async (orderId: string, requestId: string) => {
  const response = await getOrders().captureOrder({
    id: orderId,
    paypalRequestId: requestId,
    prefer: 'return=representation',
  })

  return { id: response.result?.id, status: response.result?.status }
}
