// The only art the kit ships. A tick, a cross and a clock are not anyone's trademark, which
// card-scheme and wallet logos are - those stay yours to license and pass in.

import type { ReactElement } from 'react'
import { cx } from './cx'

export interface StateIconProps {
  className?: string
}

const frame = (className?: string) => ({
  viewBox: '0 0 48 48',
  className: cx('ck-icon', className),
  focusable: 'false' as const,
  // Decorative: the heading beside it already says what happened.
  'aria-hidden': true,
  fill: 'none' as const,
  stroke: 'currentColor' as const,
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

/** Drawn on when it arrives - the one animation in a checkout worth the bytes. */
export const SuccessIcon = ({ className }: StateIconProps): ReactElement => (
  <svg {...frame(cx('ck-icon--success', className))}>
    <circle cx="24" cy="24" r="21" className="ck-icon__ring" />
    <path d="M15 24.5l6.5 6.5L33 19" className="ck-icon__mark" />
  </svg>
)

export const FailureIcon = ({ className }: StateIconProps): ReactElement => (
  <svg {...frame(cx('ck-icon--failure', className))}>
    <circle cx="24" cy="24" r="21" className="ck-icon__ring" />
    <path d="M17 17l14 14M31 17L17 31" className="ck-icon__mark" />
  </svg>
)

/** Cancelled, or expired: an outcome that is neither a success nor a decline. */
export const NeutralIcon = ({ className }: StateIconProps): ReactElement => (
  <svg {...frame(className)}>
    <circle cx="24" cy="24" r="21" className="ck-icon__ring" />
    <path d="M24 14v11l7 4" className="ck-icon__mark" />
  </svg>
)
