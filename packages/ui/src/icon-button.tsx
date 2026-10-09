import type { ReactElement, ReactNode } from 'react'
import { Button, type ButtonProps } from './button'
import { cx } from './cx'

export interface IconButtonProps extends Omit<
  ButtonProps,
  'children' | 'leftIcon' | 'rightIcon' | 'fullWidth' | 'aria-label'
> {
  /** Required accessible name; localize it like any other button label. */
  label: string
  children: ReactNode
}

/** A full tap target around an icon, with the same native behavior as Button. */
export const IconButton = ({
  label,
  children,
  variant = 'ghost',
  className,
  ...props
}: IconButtonProps): ReactElement => (
  <Button
    {...props}
    variant={variant}
    fullWidth={false}
    aria-label={label}
    className={cx('ck-icon-button', className)}
  >
    <span aria-hidden="true">{children}</span>
  </Button>
)
