import { useEffect, useRef, useState, type RefObject } from 'react'
import { ErrorText } from '@checkout-kit/ui'
import { getStripe } from './provider-sdks'

export type TokenizeCard = () => Promise<string>

/** Stripe owns the sensitive inputs; checkout-kit only receives a PaymentMethod id. */
export const StripeFields = ({
  tokenization,
}: {
  tokenization: RefObject<TokenizeCard | null>
}) => {
  const mount = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let stopped = false
    let destroy = () => {}
    void getStripe()
      .then((stripe) => {
        if (stopped || !mount.current) return
        const card = stripe.elements().create('card')
        card.mount(mount.current)
        card.on('change', (event) => setError(event.error?.message ?? ''))
        tokenization.current = async () => {
          const result = await stripe.createPaymentMethod({ type: 'card', card })
          if (result.error || !result.paymentMethod)
            throw new Error(result.error?.message ?? 'The card could not be tokenized.')
          return result.paymentMethod.id
        }
        destroy = () => card.destroy()
      })
      .catch((cause: unknown) => {
        if (!stopped) setError(cause instanceof Error ? cause.message : 'Stripe.js could not load.')
      })
    return () => {
      stopped = true
      tokenization.current = null
      destroy()
    }
  }, [tokenization])
  return (
    <>
      <div className="ck-input" ref={mount} />
      <ErrorText>{error}</ErrorText>
    </>
  )
}
