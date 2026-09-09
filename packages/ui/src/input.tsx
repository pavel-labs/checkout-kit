import type { InputHTMLAttributes, ReactElement, Ref } from 'react'
import { cx } from './cx'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Usually comes from <Field>, along with the id and the described-by. */
  invalid?: boolean
  className?: string
  /** React 19 hands refs over as an ordinary prop; form libraries rely on it. */
  ref?: Ref<HTMLInputElement>
}

// props first: <Field> passes `aria-invalid: undefined` when there is no error, and a spread
// after the attribute would let that undefined cancel an explicit `invalid`.
export const Input = ({ className, invalid, ref, ...props }: InputProps): ReactElement => (
  <input
    {...props}
    ref={ref}
    className={cx('ck-input', className)}
    aria-invalid={invalid || props['aria-invalid'] || undefined}
  />
)
