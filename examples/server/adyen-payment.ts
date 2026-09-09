import { CheckoutAPI, Client, EnvironmentEnum, Types } from '@adyen/api-library'

let client: CheckoutAPI | undefined

const getAdyen = (): CheckoutAPI => {
  if (!client) {
    const apiKey = process.env.ADYEN_API_KEY
    if (!apiKey) throw new Error('ADYEN_API_KEY is required on the server.')
    client = new CheckoutAPI(new Client({ apiKey, environment: EnvironmentEnum.TEST }))
  }
  return client
}

export const createAdyenPayment = async (reference: string, returnUrl: string) => {
  const merchantAccount = process.env.ADYEN_MERCHANT_ACCOUNT
  if (!merchantAccount) throw new Error('ADYEN_MERCHANT_ACCOUNT is required on the server.')

  const response = await getAdyen().PaymentsApi.payments({
    amount: { currency: 'USD', value: 1999 },
    merchantAccount,
    paymentMethod: { type: Types.checkout.CardDetails.TypeEnum.Scheme },
    reference,
    returnUrl,
  })

  return {
    pspReference: response.pspReference,
    resultCode: response.resultCode,
    action: response.action,
  }
}
