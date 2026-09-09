import { useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type Ref } from 'react'
import { cx } from './cx'

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'children'
> {
  /** Beside the box, not above it, which is why this does not go through <Field>. */
  label: ReactNode
  description?: ReactNode
  /** Its presence is what marks the control invalid. */
  error?: ReactNode
  className?: string
  ref?: Ref<HTMLInputElement>
}

/**
 * A real checkbox, visually hidden and drawn with `:has(:checked)`. Space, the form's own
 * validation and the screen-reader announcement all come from the browser.
 *
 * The consent control a checkout cannot do without: accepting terms, saving a card,
 * billing-same-as-shipping.
 */
export const Checkbox = ({
  label,
  description,
  error,
  className,
  ref,
  ...props
}: CheckboxProps): ReactElement => {
  const id = useId()
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('ck-checkbox-field', error && 'ck-checkbox-field--invalid', className)}>
      <label className="ck-checkbox" htmlFor={id}>
        <input
          {...props}
          ref={ref}
          id={id}
          type="checkbox"
          className="ck-checkbox__input"
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
        />
        <span className="ck-checkbox__box" aria-hidden="true">
          <svg viewBox="0 0 16 16" className="ck-checkbox__tick" focusable="false">
            <path
              d="M3.5 8.5l3 3 6-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="ck-checkbox__body">
          <span className="ck-checkbox__label">{label}</span>
          {description ? (
            <span className="ck-checkbox__description" id={descriptionId}>
              {description}
            </span>
          ) : null}
        </span>
      </label>

      {/* Polite: the one assertive region on the page belongs to the payment. */}
      {error ? (
        <p className="ck-field__error" id={errorId} role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  )
}
