import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface TrustStripProps {
  /** Short reassurances. Yours: what is true of your setup is not true of everyone's. */
  children: ReactNode
  icon?: ReactNode
  className?: string
}

/**
 * The quiet line under the pay button.
 *
 * The kit ships no wording, because the wording is a claim about your business - who holds
 * the card data, who is PCI-certified, which scheme rules you are under - and a library
 * cannot know whether any of it is true.
 */
export const TrustStrip = ({ children, icon, className }: TrustStripProps): ReactElement => (
  <p className={cx('ck-trust', className)}>
    {icon ? (
      <span className="ck-trust__icon" aria-hidden="true">
        {icon}
      </span>
    ) : null}
    <span className="ck-trust__text">{children}</span>
  </p>
)
