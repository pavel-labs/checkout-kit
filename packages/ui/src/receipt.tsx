import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface ReceiptProps {
  children: ReactNode
  className?: string
}

/** What a payment left behind - the lines a shopper screenshots. Goes in a state screen's
 * `details` slot. */
export const Receipt = ({ children, className }: ReceiptProps): ReactElement => (
  <div className={cx('ck-receipt', className)}>{children}</div>
)
