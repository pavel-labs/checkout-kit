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
 * A placeholder for something still loading. Always `aria-hidden`: the wait is announced
 * once by whatever owns it - `<SkeletonText>`, or your own `aria-busy` - not per box.
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

/** A paragraph of skeleton, announced once. The last line is short so it reads as text. */
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
