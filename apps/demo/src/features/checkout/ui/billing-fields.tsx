import { useFormContext } from 'react-hook-form'
import { Field, FieldGroup, FieldRow, Input, InputGroup, Select } from '@checkout-kit/ui'
import { CheckoutIcon } from '@/shared/ui/icons/checkout'
import { COUNTRIES } from '../model/countries'
import type { CheckoutFormInput } from '../model/schema'

export const ContactEmail = () => {
  const { register, formState } = useFormContext<CheckoutFormInput>()
  return (
    <Field label="Email" error={formState.errors.email?.message} required>
      {(control) => (
        <InputGroup leading={<CheckoutIcon name="mail" />}>
          <Input
            {...control}
            {...register('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </InputGroup>
      )}
    </Field>
  )
}

export const BillingFields = () => {
  const { register, formState } = useFormContext<CheckoutFormInput>()
  const errors = formState.errors

  return (
    <FieldGroup legend="Billing address" hint="Your bank may use this to verify your payment.">
      <FieldRow>
        <Field label="Country" error={errors.billing?.country?.message} required>
          {(control) => (
            <Select {...control} {...register('billing.country')} autoComplete="country">
              <option value="">Choose a country</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Postal code" error={errors.billing?.postalCode?.message} required>
          {(control) => (
            <Input
              {...control}
              {...register('billing.postalCode')}
              autoComplete="postal-code"
              placeholder="Postal code"
            />
          )}
        </Field>
      </FieldRow>
    </FieldGroup>
  )
}
