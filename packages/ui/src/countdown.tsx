import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { cx } from './cx'

export interface CountdownProps {
  /** When it runs out. An ISO string, a Date, or epoch millis - `action.expiresAt` fits. */
  expiresAt: string | number | Date
  onExpire?: () => void
  /** Wording around the clock: `(remaining) => 'Expires in ' + remaining`. */
  children?: (remaining: string, secondsLeft: number) => ReactNode
  expiredLabel?: ReactNode
  /** Below this many seconds the clock is marked urgent. */
  urgentBelowSeconds?: number
  className?: string
}

const format = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const secondsUntil = (target: number): number =>
  Math.max(0, Math.ceil((target - Date.now()) / 1000))

/**
 * How long is left to pay - a QR window, a transfer deadline. Silent while it runs: a live
 * region that speaks every second is unusable, so only the expiry is announced.
 */
export const Countdown = ({
  expiresAt,
  onExpire,
  children,
  expiredLabel = 'Expired',
  urgentBelowSeconds = 60,
  className,
}: CountdownProps): ReactElement => {
  const target = new Date(expiresAt).getTime()

  // Derived from the clock rather than stored, so there is nothing to keep in sync with
  // `expiresAt`. The interval only asks for a re-render.
  const [, tick] = useState(0)
  const secondsLeft = secondsUntil(target)

  useEffect(() => {
    if (secondsUntil(target) === 0) {
      onExpire?.()
      return
    }

    // Measured off the deadline, not counted down: a backgrounded tab throttles its timers.
    const id = setInterval(() => {
      tick((count) => count + 1)
      if (secondsUntil(target) === 0) {
        clearInterval(id)
        onExpire?.()
      }
    }, 1000)

    return () => clearInterval(id)
  }, [target, onExpire])

  const expired = secondsLeft === 0
  const remaining = format(secondsLeft)

  return (
    <p
      className={cx(
        'ck-countdown',
        expired && 'ck-countdown--expired',
        !expired && secondsLeft <= urgentBelowSeconds && 'ck-countdown--urgent',
        className,
      )}
      role="status"
      aria-live={expired ? 'polite' : 'off'}
    >
      {expired ? (
        expiredLabel
      ) : children ? (
        children(remaining, secondsLeft)
      ) : (
        <>
          <span className="ck-visually-hidden">Time remaining </span>
          <time dateTime={`PT${secondsLeft}S`}>{remaining}</time>
        </>
      )}
    </p>
  )
}
