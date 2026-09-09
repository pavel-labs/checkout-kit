import type { ReactNode } from 'react'
import type { PaymentUiState } from '@checkout-kit/core'

/*
 * Every string the kit renders, in one place. There is no i18n library in here and no opinion
 * about which one you use: each component takes a partial override of the set below.
 */

export interface PaymentStatusMessages {
  readonly submitting: string
  readonly processing: string
  readonly requires_action: string
  readonly success: string
  readonly failure: string
  readonly cancelled: string
}

/** English defaults. Every component that shows one takes an override. */
export const PAYMENT_STATUS_MESSAGES: PaymentStatusMessages = {
  submitting: 'Sending your payment',
  processing: 'Confirming your payment',
  requires_action: 'Waiting for your bank',
  success: 'Payment approved',
  failure: 'Payment failed',
  cancelled: 'Payment cancelled',
}

/** States that have nothing to announce: the shopper is still filling the form in. */
export const SILENT_STATES: readonly PaymentUiState[] = ['idle', 'editing', 'validating']

export interface AddressLabels {
  readonly legend: ReactNode
  readonly country: ReactNode
  readonly line1: ReactNode
  readonly line2: ReactNode
  readonly city: ReactNode
  readonly region: ReactNode
  readonly postalCode: ReactNode
  readonly countryPlaceholder: string
  readonly optional: string
}

export const ADDRESS_LABELS: AddressLabels = {
  legend: 'Billing address',
  country: 'Country',
  line1: 'Address',
  line2: 'Apartment, suite, etc.',
  city: 'City',
  region: 'State or province',
  postalCode: 'Postal code',
  countryPlaceholder: 'Select a country',
  optional: '(optional)',
}

export interface ContactLabels {
  readonly legend: ReactNode
  readonly email: ReactNode
  readonly emailHint: ReactNode
  readonly phone: ReactNode
  readonly optional: string
}

export const CONTACT_LABELS: ContactLabels = {
  legend: 'Contact',
  email: 'Email',
  emailHint: 'Where the receipt goes',
  phone: 'Phone',
  optional: '(optional)',
}

export interface PromoCodeLabels {
  readonly label: ReactNode
  readonly placeholder: string
  readonly apply: ReactNode
  readonly remove: ReactNode
  readonly appliedPrefix: ReactNode
}

export const PROMO_CODE_LABELS: PromoCodeLabels = {
  label: 'Promo code',
  placeholder: 'Enter a code',
  apply: 'Apply',
  remove: 'Remove',
  appliedPrefix: 'Applied',
}

export interface SavedInstrumentLabels {
  readonly legend: ReactNode
  readonly endingIn: (last4: string) => string
  readonly expires: (expiry: string) => string
  readonly expired: ReactNode
  readonly useAnother: ReactNode
}

export const SAVED_INSTRUMENT_LABELS: SavedInstrumentLabels = {
  legend: 'Saved payment methods',
  endingIn: (last4) => `ending in ${last4}`,
  expires: (expiry) => `Expires ${expiry}`,
  expired: 'Expired',
  useAnother: 'Use another payment method',
}
