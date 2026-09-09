import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface Step {
  readonly id: string
  readonly label: ReactNode
}

export interface StepsProps {
  steps: readonly Step[]
  /** The one being worked on. Everything before it counts as done. */
  current: string
  label?: string
  /** `(index, total) => ...` for the line a screen reader hears. */
  progressLabel?: (position: number, total: number) => string
  className?: string
}

const defaultProgress = (position: number, total: number): string => `Step ${position} of ${total}`

/**
 * Where the shopper is in a checkout that has more than one screen.
 *
 * An ordered list, not a set of tabs: these are not panels you can switch between, and
 * calling them tabs would promise a keyboard interaction that does not exist. The state of
 * each step is spelled out in text for a screen reader rather than left to the colour.
 */
export const Steps = ({
  steps,
  current,
  label = 'Checkout progress',
  progressLabel = defaultProgress,
  className,
}: StepsProps): ReactElement => {
  const index = steps.findIndex((step) => step.id === current)

  return (
    <nav aria-label={label} className={cx('ck-steps', className)}>
      <p className="ck-visually-hidden">{progressLabel(index + 1, steps.length)}</p>
      <ol className="ck-steps__list">
        {steps.map((step, position) => {
          const state = position < index ? 'done' : position === index ? 'current' : 'upcoming'

          return (
            <li
              key={step.id}
              className={cx('ck-step', `ck-step--${state}`)}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="ck-step__marker" aria-hidden="true">
                {position + 1}
              </span>
              <span className="ck-step__label">{step.label}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
