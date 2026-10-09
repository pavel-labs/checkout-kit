import type { ReactElement } from 'react'
import type { PaymentUiState } from '@checkout-kit/core'
import { cx } from './cx'
import { PAYMENT_STATUS_MESSAGES, SILENT_STATES, type PaymentStatusMessages } from './messages'

export interface PaymentStatusProps {
  state: PaymentUiState
  /** Replaces the default line, e.g. with the issuer's own decline message. */
  message?: string
  messages?: Partial<PaymentStatusMessages>
  /** Off for a static specimen or a duplicate visual status. Defaults to true. */
  announce?: boolean
  className?: string
}

/** The one live region on a checkout: field errors stay quiet so the payment is heard. */
export const PaymentStatus = ({
  state,
  message,
  messages,
  announce = true,
  className,
}: PaymentStatusProps): ReactElement => {
  const copy = { ...PAYMENT_STATUS_MESSAGES, ...messages }
  const text = SILENT_STATES.includes(state)
    ? ''
    : (message ?? copy[state as keyof PaymentStatusMessages])

  const tone = state === 'success' ? 'success' : state === 'failure' ? 'failure' : null

  return (
    <p
      role={announce ? 'status' : undefined}
      aria-live={announce ? 'polite' : 'off'}
      className={cx('ck-payment-status', tone && `ck-payment-status--${tone}`, className)}
    >
      {text}
    </p>
  )
}
