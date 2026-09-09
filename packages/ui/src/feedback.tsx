import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface ErrorTextProps {
  children?: ReactNode
  id?: string
  className?: string
}

/**
 * The payment-level error, and the only alert on the page. Field errors are polite - see
 * `<Field>` - so a decline interrupts and a typo does not.
 */
export const ErrorText = ({ children, id, className }: ErrorTextProps): ReactElement | null =>
  children ? (
    <p role="alert" id={id} className={cx('ck-error', className)}>
      {children}
    </p>
  ) : null

export interface StatusTextProps {
  children: ReactNode
  tone?: 'success' | 'failure' | 'neutral'
  className?: string
}

/** Static outcome wording. The live region belongs to `<PaymentStatus>`, not to this. */
export const StatusText = ({
  children,
  tone = 'neutral',
  className,
}: StatusTextProps): ReactElement => (
  <p className={cx('ck-status', tone !== 'neutral' && `ck-status--${tone}`, className)}>
    {children}
  </p>
)
