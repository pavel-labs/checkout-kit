import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { Button, type ButtonProps } from './button'

export interface CopyButtonProps extends Omit<ButtonProps, 'children' | 'onClick'> {
  /** What lands on the clipboard: a transfer code, a reference, an IBAN. */
  value: string
  children?: ButtonProps['children']
  copiedLabel?: string
  /** How long the confirmation stays up. */
  resetAfterMs?: number
  onCopied?: (value: string) => void
}

/** Copies a value. The label confirms it, so the change is announced and not just drawn. */
export const CopyButton = ({
  value,
  children = 'Copy',
  copiedLabel = 'Copied',
  resetAfterMs = 2000,
  onCopied,
  variant = 'ghost',
  size = 'sm',
  fullWidth = false,
  ...props
}: CopyButtonProps): ReactElement => {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Denied, or an insecure origin. The value is on screen and selectable anyway.
      return
    }

    setCopied(true)
    onCopied?.(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), resetAfterMs)
  }, [value, onCopied, resetAfterMs])

  return (
    <Button {...props} variant={variant} size={size} fullWidth={fullWidth} onClick={copy}>
      <span aria-live="polite">{copied ? copiedLabel : children}</span>
    </Button>
  )
}
