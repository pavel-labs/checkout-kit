import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'
import { CONTACT_LABELS, type ContactLabels } from './messages'
import { Field, FieldGroup } from './field'
import { Input } from './input'

export interface ContactValue {
  readonly email?: string
  readonly phone?: string
}

export type ContactFieldName = keyof ContactValue

export type ContactErrors = Partial<Record<ContactFieldName, ReactNode>>

export interface ContactFieldsProps {
  value: ContactValue
  onChange: (value: ContactValue) => void
  errors?: ContactErrors
  fields?: readonly ContactFieldName[]
  labels?: Partial<ContactLabels>
  disabled?: boolean
  className?: string
}

/**
 * Where the receipt goes. `type="email"` for the phone keyboard, but no validation - your
 * schema already does that, and a regex here would only disagree with it.
 */
export const ContactFields = ({
  value,
  onChange,
  errors = {},
  fields = ['email', 'phone'],
  labels,
  disabled = false,
  className,
}: ContactFieldsProps): ReactElement => {
  const copy = { ...CONTACT_LABELS, ...labels }
  const set = (name: ContactFieldName) => (next: string) => onChange({ ...value, [name]: next })

  return (
    <FieldGroup legend={copy.legend} className={cx('ck-contact', className)}>
      {fields.includes('email') ? (
        <Field label={copy.email} hint={copy.emailHint} error={errors.email} required>
          {(control) => (
            <Input
              {...control}
              type="email"
              inputMode="email"
              value={value.email ?? ''}
              onChange={(event) => set('email')(event.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              disabled={disabled}
            />
          )}
        </Field>
      ) : null}

      {fields.includes('phone') ? (
        <Field label={copy.phone} error={errors.phone} optionalText={copy.optional}>
          {(control) => (
            <Input
              {...control}
              type="tel"
              inputMode="tel"
              value={value.phone ?? ''}
              onChange={(event) => set('phone')(event.target.value)}
              autoComplete="tel"
              disabled={disabled}
            />
          )}
        </Field>
      ) : null}
    </FieldGroup>
  )
}
