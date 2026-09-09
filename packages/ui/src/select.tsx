import type { ReactElement, ReactNode, Ref, SelectHTMLAttributes } from 'react'
import { cx } from './cx'

export interface SelectOption {
  readonly value: string
  readonly label: string
  readonly disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Usually comes from `<Field>`, along with the id and the described-by. */
  invalid?: boolean
  /** Rendered as `<option>`s. Pass children instead when you need `<optgroup>`. */
  options?: readonly SelectOption[]
  /** A disabled, selected first option: the "Country" a native select cannot express. */
  placeholder?: string
  className?: string
  children?: ReactNode
  ref?: Ref<HTMLSelectElement>
}

/**
 * A real `<select>`, so the shopper gets the platform's own picker - the wheel on iOS, the
 * dropdown on Android - rather than a listbox drawn in JavaScript.
 */
export const Select = ({
  className,
  invalid,
  options,
  placeholder,
  children,
  ref,
  ...props
}: SelectProps): ReactElement => (
  <select
    {...props}
    ref={ref}
    className={cx('ck-input', className)}
    aria-invalid={invalid || props['aria-invalid'] || undefined}
  >
    {placeholder ? (
      <option value="" disabled>
        {placeholder}
      </option>
    ) : null}
    {options?.map((option) => (
      <option key={option.value} value={option.value} disabled={option.disabled}>
        {option.label}
      </option>
    ))}
    {children}
  </select>
)
