import { useEffect, useRef, type ReactElement, type ReactNode } from 'react'
import { cx } from './cx'

export interface ValidationProblem {
  /** The id of the control it belongs to, so the link moves focus to the field itself. */
  readonly fieldId?: string
  readonly message: ReactNode
}

export interface ValidationSummaryProps {
  problems: readonly ValidationProblem[]
  /** `(count) => ...`, so the plural is yours to get right in your language. */
  heading?: (count: number) => ReactNode
  /** Takes focus when problems appear. Off if your form already moves focus itself. */
  autoFocus?: boolean
  className?: string
}

const defaultHeading = (count: number): string =>
  count === 1 ? 'There is 1 problem with this form' : `There are ${count} problems with this form`

/**
 * Every problem on the form in one place, each a link to the field it came from.
 *
 * This is what makes a long checkout usable with a screen reader: per-field errors are
 * deliberately polite - see <Field> - so on submit there is otherwise nothing that says how
 * many there were or where they are. The payment's own live region is left alone.
 */
export const ValidationSummary = ({
  problems,
  heading = defaultHeading,
  autoFocus = true,
  className,
}: ValidationSummaryProps): ReactElement | null => {
  const ref = useRef<HTMLDivElement>(null)
  const count = problems.length

  useEffect(() => {
    if (autoFocus && count > 0) ref.current?.focus()
  }, [autoFocus, count])

  if (count === 0) return null

  return (
    <div ref={ref} tabIndex={-1} role="alert" className={cx('ck-validation-summary', className)}>
      <p className="ck-validation-summary__heading">{heading(count)}</p>
      <ul className="ck-validation-summary__list">
        {problems.map((problem, index) => (
          <li key={problem.fieldId ?? index}>
            {problem.fieldId ? (
              <a href={`#${problem.fieldId}`} className="ck-validation-summary__link">
                {problem.message}
              </a>
            ) : (
              problem.message
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
