import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface DisclosureProps {
  /** The always-visible line that opens it. */
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

/**
 * A real `<details>`: "What is a CVC?", "Why do you need my address?". Native, so the open
 * state, the keyboard and find-in-page are the browser's.
 */
export const Disclosure = ({
  summary,
  children,
  defaultOpen = false,
  className,
}: DisclosureProps): ReactElement => (
  <details className={cx('ck-disclosure', className)} open={defaultOpen || undefined}>
    <summary className="ck-disclosure__summary">{summary}</summary>
    <div className="ck-disclosure__content">{children}</div>
  </details>
)
