import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface InputGroupProps {
  /** The native Input. Spread Field's control props onto it, not onto the group. */
  children: ReactNode
  /** Decorative icon or prefix. Interactive content belongs in trailing. */
  leading?: ReactNode
  /** A suffix or an explicitly labelled IconButton, e.g. to clear the field. */
  trailing?: ReactNode
  className?: string
}

/** Visual composition only: the child keeps its label, ref and native form behavior. */
export const InputGroup = ({
  children,
  leading,
  trailing,
  className,
}: InputGroupProps): ReactElement => (
  <div className={cx('ck-input-group', className)}>
    {leading ? (
      <span className="ck-input-group__leading" aria-hidden="true">
        {leading}
      </span>
    ) : null}
    {children}
    {trailing ? <span className="ck-input-group__trailing">{trailing}</span> : null}
  </div>
)
