import type { ReactElement } from 'react'
import { formatMoney, type FormatMoneyOptions, type Money as MoneyValue } from '@checkout-kit/core'
import { cx } from './cx'

export interface MoneyProps extends FormatMoneyOptions {
  /** Minor units, the way an intent carries them. */
  amount: number
  currency: string
  className?: string
}

/**
 * An amount, in the shopper's locale. Tabular figures, so a column of them lines up and a
 * total does not shift as it changes.
 */
export const Money = ({
  amount,
  currency,
  locale,
  display,
  className,
}: MoneyProps): ReactElement => (
  <span className={cx('ck-money', className)}>
    {formatMoney({ amount, currency }, { locale, display })}
  </span>
)

export type { MoneyValue }
