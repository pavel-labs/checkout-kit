import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface DividerProps {
  /** The word in the middle of the rule, usually "or". */
  children?: ReactNode
  className?: string
}

/**
 * A rule between two ways of paying. With a label it is a real separator with a name, so a
 * screen reader says "or" once rather than reading a decorative line.
 */
export const Divider = ({ children, className }: DividerProps): ReactElement =>
  children ? (
    <div className={cx('ck-divider', 'ck-divider--labelled', className)} role="separator">
      <span className="ck-divider__label">{children}</span>
    </div>
  ) : (
    <hr className={cx('ck-divider', className)} />
  )
