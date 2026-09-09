import { useId, type ReactElement, type ReactNode } from 'react'
import { cx } from './cx'

/** `h2` suits a checkout whose page title is the `h1`; drop a level when yours is nested. */
export type HeadingLevel = 'h2' | 'h3' | 'h4'

export interface SectionHeadingProps {
  children: ReactNode
  description?: ReactNode
  as?: HeadingLevel
  id?: string
  className?: string
}

/** The title of a group, and the optional line under it. Shared by `<Section>` and `<Panel>`. */
export const SectionHeading = ({
  children,
  description,
  as: Tag = 'h2',
  id,
  className,
}: SectionHeadingProps): ReactElement => (
  <div className={cx('ck-section__header', className)}>
    <Tag className="ck-section__title" id={id}>
      {children}
    </Tag>
    {description ? <p className="ck-section__description">{description}</p> : null}
  </div>
)

export interface SectionProps {
  children: ReactNode
  /** Renders the heading, and names the section so a screen reader can jump to it. */
  title?: ReactNode
  description?: ReactNode
  headingLevel?: HeadingLevel
  className?: string
}

/** A group of related controls. The kit's only layout opinion. */
export const Section = ({
  children,
  title,
  description,
  headingLevel,
  className,
}: SectionProps): ReactElement => {
  // A `<section>` is only a landmark once it has a name, so the id is worth the hook.
  const headingId = useId()

  return (
    <section
      className={cx('ck-section', className)}
      aria-labelledby={title ? headingId : undefined}
    >
      {title ? (
        <SectionHeading as={headingLevel} id={headingId} description={description}>
          {title}
        </SectionHeading>
      ) : null}
      {children}
    </section>
  )
}
