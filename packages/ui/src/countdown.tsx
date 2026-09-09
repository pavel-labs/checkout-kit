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
 * How long is left to pay: a QR code's window, a transfer's deadline, a session about to go.
 *
 * Announced only at the end. A live region that speaks every second is unusable, so the
 * clock is silent while it runs and the expiry is what interrupts.
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

  // The seconds left are derived from the clock, not stored: state would have to be kept in
  // sync with `expiresAt` on every change, and this way there is nothing to keep in sync. The
  // interval only asks for a re-render.
  const [, tick] = useState(0)
  const secondsLeft = secondsUntil(target)

  useEffect(() => {
    if (secondsUntil(target) === 0) {
      onExpire?.()
      return
    }

    // Measured off the deadline rather than counting a local number down: a backgrounded tab
    // throttles its timers, and a resumed one would otherwise be minutes out.
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
