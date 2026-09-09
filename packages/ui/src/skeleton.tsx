import type { CSSProperties, ReactElement } from 'react'
import { cx } from './cx'

export interface SkeletonProps {
  /** Any CSS length. Defaults to the full line. */
  width?: string
  height?: string
  radius?: string
  className?: string
}

/**
 * A placeholder for something still loading.
 *
 * `aria-hidden`, always: a screen reader should hear "loading" once, from whatever region
 * owns the wait, not a stutter of empty boxes. Wrap a group in <SkeletonText> or put your
 * own `aria-busy` on the container.
 */
export const Skeleton = ({ width, height, radius, className }: SkeletonProps): ReactElement => (
  <span
    aria-hidden="true"
    className={cx('ck-skeleton', className)}
    style={
      {
        '--ck-skeleton-width': width,
        '--ck-skeleton-height': height,
        '--ck-skeleton-radius': radius,
      } as CSSProperties
    }
  />
)

export interface SkeletonTextProps {
  /** How many lines to stand in for. */
  lines?: number
  label?: string
  className?: string
}

/**
 * A paragraph's worth of skeleton, with one polite announcement for the whole group. The
 * last line is short, because a full-width last line does not read as text.
 */
export const SkeletonText = ({
  lines = 3,
  label = 'Loading',
  className,
}: SkeletonTextProps): ReactElement => (
  <span className={cx('ck-skeleton-text', className)} role="status" aria-busy="true">
    <span className="ck-visually-hidden">{label}</span>
    {Array.from({ length: lines }, (_unused, index) => (
      <Skeleton key={index} width={index === lines - 1 ? '60%' : undefined} />
    ))}
  </span>
)
