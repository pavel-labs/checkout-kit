// Autofill is the point of this component: every token below is one a browser recognises, and
// a single wrong one silently turns filling off for the whole form.

import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'
import { ADDRESS_LABELS, type AddressLabels } from './messages'
import { Field, FieldGroup, FieldRow, type FieldControlProps } from './field'
import { Input } from './input'
import { Select, type SelectOption } from './select'

export interface AddressValue {
  readonly country?: string
  readonly line1?: string
  readonly line2?: string
  readonly city?: string
  readonly region?: string
  readonly postalCode?: string
}

export type AddressFieldName = keyof AddressValue

/** One message per field, keyed the same way the value is. */
export type AddressErrors = Partial<Record<AddressFieldName, ReactNode>>

export interface AddressFieldsProps {
  value: AddressValue
  onChange: (value: AddressValue) => void
  /** From you: the kit ships no country list, and yours is shorter than the world's. */
  countries: readonly SelectOption[]
  errors?: AddressErrors
  /** Drop the ones your provider does not ask for. */
  fields?: readonly AddressFieldName[]
  labels?: Partial<AddressLabels>
  /** `shipping` switches the autofill section, so the two addresses fill separately. */
  autoCompleteSection?: 'billing' | 'shipping'
  disabled?: boolean
  className?: string
}

const DEFAULT_FIELDS: readonly AddressFieldName[] = [
  'country',
  'line1',
  'line2',
  'city',
  'region',
  'postalCode',
]

export const AddressFields = ({
  value,
  onChange,
  countries,
  errors = {},
  fields = DEFAULT_FIELDS,
  labels,
  autoCompleteSection = 'billing',
  disabled = false,
  className,
}: AddressFieldsProps): ReactElement => {
  const copy = { ...ADDRESS_LABELS, ...labels }
  const shows = (name: AddressFieldName) => fields.includes(name)
  const set = (name: AddressFieldName) => (next: string) => onChange({ ...value, [name]: next })
  const token = (name: string) => `${autoCompleteSection} ${name}`

  const text = (
    name: AddressFieldName,
    autoComplete: string,
    control: FieldControlProps,
    extra?: Record<string, string>,
  ) => (
    <Input
      {...control}
      {...extra}
      type="text"
      value={value[name] ?? ''}
      onChange={(event) => set(name)(event.target.value)}
      autoComplete={autoComplete}
      disabled={disabled}
    />
  )

  return (
    <FieldGroup legend={copy.legend} className={cx('ck-address', className)}>
      {shows('country') ? (
        <Field label={copy.country} error={errors.country} required>
          {(control) => (
            <Select
              {...control}
              value={value.country ?? ''}
              onChange={(event) => set('country')(event.target.value)}
              options={countries}
              placeholder={copy.countryPlaceholder}
              autoComplete={token('country')}
              disabled={disabled}
            />
          )}
        </Field>
      ) : null}

      {shows('line1') ? (
        <Field label={copy.line1} error={errors.line1} required>
          {(control) => text('line1', token('address-line1'), control)}
        </Field>
      ) : null}

      {shows('line2') ? (
        <Field label={copy.line2} error={errors.line2} optionalText={copy.optional}>
          {(control) => text('line2', token('address-line2'), control)}
        </Field>
      ) : null}

      {shows('city') || shows('postalCode') ? (
        <FieldRow>
          {shows('city') ? (
            <Field label={copy.city} error={errors.city} required>
              {(control) => text('city', token('address-level2'), control)}
            </Field>
          ) : null}
          {shows('postalCode') ? (
            <Field label={copy.postalCode} error={errors.postalCode} required>
              {(control) =>
                // Not `inputMode="numeric"`: plenty of postal codes have letters in them.
                text('postalCode', token('postal-code'), control, { autoCapitalize: 'characters' })
              }
            </Field>
          ) : null}
        </FieldRow>
      ) : null}

      {shows('region') ? (
        <Field label={copy.region} error={errors.region}>
          {(control) => text('region', token('address-level1'), control)}
        </Field>
      ) : null}
    </FieldGroup>
  )
}
