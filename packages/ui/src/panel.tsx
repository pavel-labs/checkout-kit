import { useId, type ReactElement, type ReactNode } from 'react'
import { cx } from './cx'
import { SectionHeading, type HeadingLevel } from './section'

export interface PanelProps {
  children: ReactNode
  title?: ReactNode
  description?: ReactNode
  headingLevel?: HeadingLevel
  /** End of the header row: a total, a count, an edit link. */
  aside?: ReactNode
  className?: string
}

/**
 * An opt-in raised surface. Opt-in because a page that already draws its own card should not
 * get a second one, so nothing in the kit reaches for this on your behalf.
 */
export const Panel = ({
  children,
  title,
  description,
  headingLevel,
  aside,
  className,
}: PanelProps): ReactElement => {
  const headingId = useId()

  return (
    <section className={cx('ck-panel', className)} aria-labelledby={title ? headingId : undefined}>
      {title ? (
        <div className="ck-panel__header">
          <SectionHeading as={headingLevel} id={headingId} description={description}>
            {title}
          </SectionHeading>
          {aside ? <div className="ck-panel__aside">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
