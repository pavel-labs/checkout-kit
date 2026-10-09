import { loadStripe } from '@stripe/stripe-js/pure'
import type { Stripe } from '@stripe/stripe-js'
import type { Core, PaymentAction } from '@adyen/adyen-web'
import type { SdkAdapter } from '@checkout-kit/runtime-browser'

export const stripeElementsEnabled = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
export const adyenFieldsEnabled = Boolean(import.meta.env.VITE_ADYEN_CLIENT_KEY)
let stripeClient: Promise<Stripe | null> | undefined
export const getStripe = async (): Promise<Stripe> => {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  if (!key?.startsWith('pk_test_'))
    throw new Error('Set VITE_STRIPE_PUBLISHABLE_KEY to a Stripe test key.')
  stripeClient ??= loadStripe(key)
  const stripe = await stripeClient
  if (!stripe) throw new Error('Stripe.js could not load.')
  return stripe
}
let adyenClient: Promise<Core> | undefined
export const getAdyen = (): Promise<Core> => {
  const clientKey = import.meta.env.VITE_ADYEN_CLIENT_KEY
  if (!clientKey?.startsWith('test_'))
    return Promise.reject(new Error('Set VITE_ADYEN_CLIENT_KEY to an Adyen test client key.'))
  adyenClient ??= import('@adyen/adyen-web')
    .then(({ AdyenCheckout }) =>
      AdyenCheckout({
        environment: 'test',
        clientKey,
        countryCode: 'US',
        locale: 'en-US',
        amount: { value: 2500, currency: 'USD' },
        showPayButton: false,
      }),
    )
    .catch((cause: unknown) => {
      adyenClient = undefined
      throw cause
    })
  return adyenClient
}

/** The SDK produces details, then the checkout provider submits them to the merchant API. */
export const adyenSdkAdapter: SdkAdapter = {
  sdk: 'adyen',
  request: async (params, signal) => {
    const checkout = await getAdyen()
    if (signal.aborted) throw new Error('The payment was canceled.')
    if (!params.action || typeof params.action !== 'object')
      throw new Error('Missing Adyen action.')
    return new Promise((resolve, reject) => {
      const dialog = document.createElement('dialog')
      dialog.setAttribute('aria-label', 'Adyen authentication')
      dialog.style.cssText = 'width:min(90vw,32rem);padding:24px;border:0;border-radius:12px'
      const mount = document.createElement('div')
      const cancel = document.createElement('button')
      cancel.textContent = 'Cancel authentication'
      dialog.append(mount, cancel)
      document.body.append(dialog)
      let unmount = () => {}
      let finished = false
      const finish = (payload?: unknown, cause?: unknown) => {
        if (finished) return
        finished = true
        signal.removeEventListener('abort', onAbort)
        unmount()
        dialog.remove()
        if (cause) reject(cause)
        else resolve(payload)
      }
      const onAbort = () => finish(undefined, new Error('The payment was canceled.'))
      signal.addEventListener('abort', onAbort, { once: true })
      cancel.addEventListener('click', onAbort)
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault()
        onAbort()
      })
      try {
        const component = checkout
          .createFromAction(params.action as PaymentAction, {
            onAdditionalDetails: (state) => finish(state.data),
            onError: (cause) => finish(undefined, cause),
          })
          .mount(mount)
        unmount = () => component.unmount()
        if (finished) {
          unmount()
          return
        }
        dialog.showModal()
      } catch (cause) {
        finish(undefined, cause)
      }
    })
  },
}
