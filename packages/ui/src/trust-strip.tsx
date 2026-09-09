import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface TrustStripProps {
  /** Yours. What is true of your setup is not true of everyone's. */
  children: ReactNode
  icon?: ReactNode
  className?: string
}

/**
 * The quiet line under the pay button. No wording ships with it: it would be a claim about
 * your business, and a library cannot know whether it is true.
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
