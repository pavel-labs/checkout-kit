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
 * A real <dialog>, opened with `showModal()`.
 *
 * That one call is why there is no focus-trap code here: the browser already moves focus in,
 * keeps Tab inside, makes the rest of the page inert, closes on Escape and restores focus on
 * the way out. Every hand-written modal gets at least one of those wrong.
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
      // Without a name a dialog is announced as just "dialog", and the shopper has to go
      // looking for what it is asking.
      aria-labelledby={title ? headingId : undefined}
      // Escape fires `cancel` before `close`; refusing it there is what makes a dialog
      // non-dismissible, and the backdrop click below has to agree with it.
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
        // The dialog element fills the viewport including its backdrop, so a click that
        // landed on the element itself - not on the panel inside - is a backdrop click.
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
