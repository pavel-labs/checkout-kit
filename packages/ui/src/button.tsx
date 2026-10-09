import type { ButtonHTMLAttributes, ReactElement, ReactNode, Ref } from 'react'
import { cx } from './cx'
import { Spinner } from './spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  children: ReactNode
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  fullWidth?: boolean
  /** Shows a spinner and stops responding. Keeps the label: it is a moving target otherwise. */
  busy?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  className?: string
  ref?: Ref<HTMLButtonElement>
}

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  busy = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  onClick,
  'aria-disabled': ariaDisabled,
  ref,
  ...props
}: ButtonProps): ReactElement => (
  <button
    {...props}
    ref={ref}
    type={type}
    disabled={disabled}
    // Not `disabled`: that drops focus to the top of the page mid-payment.
    aria-disabled={busy || ariaDisabled || undefined}
    aria-busy={busy || undefined}
    onClick={(event) => {
      // Removing onClick alone still lets a busy submit button submit its form.
      if (busy || ariaDisabled === true || ariaDisabled === 'true') {
        event.preventDefault()
        return
      }
      onClick?.(event)
    }}
    className={cx(
      'ck-button',
      variant !== 'primary' && `ck-button--${variant}`,
      size === 'sm' && 'ck-button--sm',
      !fullWidth && 'ck-button--auto',
      className,
    )}
  >
    {busy || leftIcon ? (
      <span className="ck-button__icon" aria-hidden="true">
        {busy ? <Spinner /> : leftIcon}
      </span>
    ) : null}
    <span className="ck-button__label">{children}</span>
    {rightIcon ? (
      <span className="ck-button__icon" aria-hidden="true">
        {rightIcon}
      </span>
    ) : null}
  </button>
)
