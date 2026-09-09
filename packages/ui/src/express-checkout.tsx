import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'
import { Divider } from './divider'

export interface ExpressCheckoutProps {
  /** The wallet buttons themselves. Apple Pay and Google Pay draw their own. */
  children: ReactNode
  label?: string
  /** The word on the rule under the row. Pass null for no rule at all. */
  dividerLabel?: ReactNode | null
  /** One per row on a phone; side by side once there is room. */
  layout?: 'stack' | 'row'
  className?: string
}

/**
 * The row above the form: pay with a wallet, or carry on and type a card.
 *
 * Layout only. Every wallet mandates its own button - Apple and Google both publish rules
 * about size, corner radius and wording, and both revoke over a redraw - so the kit holds
 * the space and you bring the button their SDK gives you.
 */
export const ExpressCheckout = ({
  children,
  label = 'Express checkout',
  dividerLabel = 'or',
  layout = 'stack',
  className,
}: ExpressCheckoutProps): ReactElement => (
  <div className={cx('ck-express', className)}>
    <div
      className={cx('ck-express__buttons', layout === 'row' && 'ck-express__buttons--row')}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
    {dividerLabel === null ? null : <Divider>{dividerLabel}</Divider>}
  </div>
)
