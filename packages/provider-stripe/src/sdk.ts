/** Structural type: use the Stripe instance returned by @stripe/stripe-js. */
export interface StripeClient {
  handleNextAction(options: { clientSecret: string }): Promise<unknown>
}
export interface StripeSdkAdapter {
  readonly sdk: string
  request(params: Readonly<Record<string, unknown>>, signal: AbortSignal): Promise<unknown>
}
/** Register this with createBrowserRuntime({ sdk: { adapters: [...] } }). */
export const createStripeSdkAdapter = (
  getStripe: () => StripeClient | Promise<StripeClient>,
  sdk = 'stripe',
): StripeSdkAdapter => ({
  sdk,
  request: async (params, signal) => {
    if (typeof params.clientSecret !== 'string' || !params.clientSecret)
      throw new Error('Stripe requires the PaymentIntent client secret.')
    const stripe = await getStripe()
    if (signal.aborted) throw new Error('The payment was canceled.')
    // The provider reads the merchant API afterwards; this callback is never proof of payment.
    return stripe.handleNextAction({ clientSecret: params.clientSecret })
  },
})
