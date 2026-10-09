import { useEffect, useRef, useState, type RefObject } from 'react'
import type { PaymentInstrument } from '@checkout-kit/core'
import { ErrorText } from '@checkout-kit/ui'
import { getAdyen } from './provider-sdks'
import '@adyen/adyen-web/styles/adyen.css'

export type ReadAdyenCard = () => PaymentInstrument
export const AdyenFields = ({ readCard }: { readCard: RefObject<ReadAdyenCard | null> }) => {
  const mount = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let stopped = false
    let unmount = () => {}
    void Promise.all([getAdyen(), import('@adyen/adyen-web')])
      .then(([checkout, { Card }]) => {
        if (stopped || !mount.current) return
        const card = new Card(checkout, {
          showPayButton: false,
          brands: ['visa', 'mc', 'amex'],
        }).mount(mount.current)
        readCard.current = () => {
          if (!card.isValid) {
            card.showValidation()
            throw new Error('Complete the Adyen card fields.')
          }
          return {
            kind: 'wallet',
            walletId: 'adyen',
            payload: {
              ...card.data,
              browserInfo: card.browserInfo,
              origin: window.location.origin,
            },
          }
        }
        unmount = () => card.unmount()
      })
      .catch((cause: unknown) => {
        if (!stopped) setError(cause instanceof Error ? cause.message : 'Adyen could not load.')
      })
    return () => {
      stopped = true
      readCard.current = null
      unmount()
    }
  }, [readCard])
  return (
    <>
      <div ref={mount} />
      <ErrorText>{error}</ErrorText>
    </>
  )
}
