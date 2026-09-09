import { useId, type FormEvent, type ReactElement, type ReactNode } from 'react'
import { Badge } from './badge'
import { Button } from './button'
import { cx } from './cx'
import { PROMO_CODE_LABELS, type PromoCodeLabels } from './messages'
import { Input } from './input'

export interface PromoCodeInputProps {
  value: string
  onChange: (value: string) => void
  onApply: (value: string) => void
  /** The code that stuck. Switches the control to its applied state. */
  applied?: string | null
  onRemove?: () => void
  error?: ReactNode
  busy?: boolean
  disabled?: boolean
  labels?: Partial<PromoCodeLabels>
  className?: string
}

/**
 * A code and the button that redeems it. Not a <form> - it sits inside the checkout's own,
 * and nested forms are invalid HTML - so Enter is handled directly.
 */
export const PromoCodeInput = ({
  value,
  onChange,
  onApply,
  applied,
  onRemove,
  error,
  busy = false,
  disabled = false,
  labels,
  className,
}: PromoCodeInputProps): ReactElement => {
  const copy = { ...PROMO_CODE_LABELS, ...labels }
  const id = useId()
  const errorId = error ? `${id}-error` : undefined

  const apply = (event: FormEvent) => {
    event.preventDefault()
    if (value.trim()) onApply(value.trim())
  }

  if (applied) {
    return (
      <div className={cx('ck-promo', 'ck-promo--applied', className)}>
        <span className="ck-promo__applied">
          <Badge tone="success">{copy.appliedPrefix}</Badge>
          <span className="ck-promo__code">{applied}</span>
        </span>
        {onRemove ? (
          <Button
            variant="ghost"
            size="sm"
            fullWidth={false}
            onClick={onRemove}
            disabled={disabled}
          >
            {copy.remove}
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cx('ck-promo', className)}>
      <label className="ck-field__label" htmlFor={id}>
        {copy.label}
      </label>
      <div className="ck-promo__row">
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') apply(event)
          }}
          placeholder={copy.placeholder}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          disabled={disabled || busy}
          invalid={Boolean(error)}
          aria-describedby={errorId}
        />
        <Button
          variant="secondary"
          fullWidth={false}
          busy={busy}
          disabled={disabled || !value.trim()}
          onClick={apply}
        >
          {copy.apply}
        </Button>
      </div>
      {error ? (
        <p className="ck-field__error" id={errorId} role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  )
}
