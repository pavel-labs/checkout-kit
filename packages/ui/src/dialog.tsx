import { useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react'
import { cx } from './cx'
import { SectionHeading, type HeadingLevel } from './section'

export interface DialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: ReactNode
  description?: ReactNode
  headingLevel?: HeadingLevel
  /** `sheet` slides up from the bottom edge - the shape a phone expects. */
  variant?: 'center' | 'sheet'
  /** Off for a step the shopper must answer rather than dismiss. */
  dismissible?: boolean
  footer?: ReactNode
  className?: string
}

/**
 * A real `<dialog>`, opened with `showModal()`. That is why there is no focus-trap code here:
 * focus, Tab, inertness, Escape and focus restore are all the browser's.
 */
export const Dialog = ({
  open,
  onClose,
  children,
  title,
  description,
  headingLevel,
  variant = 'center',
  dismissible = true,
  footer,
  className,
}: DialogProps): ReactElement => {
  const ref = useRef<HTMLDialogElement>(null)
  const headingId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cx('ck-dialog', `ck-dialog--${variant}`, className)}
      // Unnamed, it is announced as just "dialog".
      aria-labelledby={title ? headingId : undefined}
      // Escape fires `cancel` first; refusing it there is what makes a dialog undismissable.
      onCancel={(event) => {
        if (!dismissible) {
          event.preventDefault()
          return
        }
        onClose()
      }}
      onClose={() => {
        if (open) onClose()
      }}
      onClick={(event) => {
        if (!dismissible) return
        // The element fills the viewport, so a click on it rather than the panel is the backdrop.
        if (event.target === ref.current) onClose()
      }}
    >
      <div className="ck-dialog__panel">
        {title ? (
          <SectionHeading as={headingLevel} id={headingId} description={description}>
            {title}
          </SectionHeading>
        ) : null}
        <div className="ck-dialog__body">{children}</div>
        {footer ? <div className="ck-dialog__footer">{footer}</div> : null}
      </div>
    </dialog>
  )
}
