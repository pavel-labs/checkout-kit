import type { ReactElement, Ref, TextareaHTMLAttributes } from 'react'
import { cx } from './cx'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  className?: string
  ref?: Ref<HTMLTextAreaElement>
}

/** Delivery notes, a gift message: the rare checkout field that is more than a line. */
export const Textarea = ({
  className,
  invalid,
  ref,
  rows = 3,
  ...props
}: TextareaProps): ReactElement => (
  <textarea
    {...props}
    ref={ref}
    rows={rows}
    className={cx('ck-input', 'ck-textarea', className)}
    aria-invalid={invalid || props['aria-invalid'] || undefined}
  />
)
