import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface DetailListProps {
  children: ReactNode
  className?: string
}

/**
 * A list of name/value lines: an invoice, a receipt, a summary of a transaction.
 *
 * Named for the `<dl>` it renders, not for the `<details>` element - that one is `<Disclosure>`.
 */
export const DetailList = ({ children, className }: DetailListProps): ReactElement => (
  <dl className={cx('ck-details', className)}>{children}</dl>
)

export interface DetailItemProps {
  name: ReactNode
  value: ReactNode
  /** Marks the line that the others add up to. */
  total?: boolean
  className?: string
}

export const DetailItem = ({
  name,
  value,
  total = false,
  className,
}: DetailItemProps): ReactElement => (
  <div className={cx('ck-item', total && 'ck-item--total', className)}>
    <dt className="ck-item__name">{name}</dt>
    <dd className="ck-item__value">{value}</dd>
  </div>
)
