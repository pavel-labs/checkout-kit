import { createCheckout, defineProvider } from '@checkout-kit/core'
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
import type { PayPalConfig } from '@checkout-kit/provider-paypal'

/** Call once in the browser. baseUrl points at the merchant's PayPal API. */
export const createPayPalCheckout = (baseUrl = '/api', returnPath = '/checkout/return') => {
  const runtime = createBrowserRuntime({ returnPath })
  const engine = createCheckout({
    providers: [
      defineProvider({
        id: 'paypal',
        config: { baseUrl, credentials: 'include' } satisfies PayPalConfig,
        load: () => import('@checkout-kit/provider-paypal'),
      }),
    ],
    runners: runtime.runners,
    storage: runtime.storage,
    returnUrl: runtime.returnUrl,
    defaultProviderId: 'paypal',
  })
  return {
    engine,
    runtime,
    async pay(planId: string) {
      // Recovery retains the original intent/key if the merchant API was unavailable.
      const restored = await engine.hydrate(runtime.readReturnParams())
      return restored ?? engine.pay({ input: { planId }, instrument: { kind: 'none' } })
    },
  }
}
