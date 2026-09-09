import type { ReactElement, ReactNode } from 'react'
import { CARD_BRANDS, type CardBrand } from '@checkout-kit/core'
import { cx } from './cx'
import { SAVED_INSTRUMENT_LABELS, type SavedInstrumentLabels } from './messages'
import { OptionCard, OptionCardGroup } from './option-card'

export interface SavedInstrument {
  readonly id: string
  /** Drives the label: "Visa ending 4242". Leave off for a non-card instrument. */
  readonly brand?: CardBrand
  readonly last4?: string
  /** "12/30". Shown as the description, and struck through when expired. */
  readonly expiry?: string
  readonly expired?: boolean
  /** Overrides the generated wording entirely - a wallet, a bank account, a saved address. */
  readonly label?: ReactNode
  readonly description?: ReactNode
  readonly icon?: ReactNode
  readonly disabled?: boolean
}

const brandName = (brand?: CardBrand): string | undefined =>
  brand && brand !== 'unknown'
    ? CARD_BRANDS.find((rule) => rule.brand === brand)?.displayName
    : undefined

export interface SavedInstrumentListProps {
  instruments: readonly SavedInstrument[]
  value: string | null
  onChange: (id: string) => void
  /** Adds a final option for paying with something new. Its id is `NEW_INSTRUMENT_ID`. */
  allowNew?: boolean
  labels?: Partial<SavedInstrumentLabels>
  /** Scheme logos are trademarks; the kit ships none. Pass yours if you have the licence. */
  icons?: Partial<Record<CardBrand, ReactNode>>
  disabled?: boolean
  className?: string
}

/** The value `onChange` reports when the shopper picks "use another payment method". */
export const NEW_INSTRUMENT_ID = '__new__'

/**
 * Cards the shopper has used before. Real radio buttons, like every other choice in the kit,
 * so arrow keys and the announcement come from the browser.
 *
 * An expired card is shown and disabled rather than hidden: a shopper who is looking for it
 * needs to see why it is not there.
 */
export const SavedInstrumentList = ({
  instruments,
  value,
  onChange,
  allowNew = true,
  labels,
  icons,
  disabled = false,
  className,
}: SavedInstrumentListProps): ReactElement => {
  const copy = { ...SAVED_INSTRUMENT_LABELS, ...labels }

  return (
    <OptionCardGroup
      label={copy.legend}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={cx('ck-saved', className)}
    >
      {instruments.map((instrument) => {
        const name = brandName(instrument.brand)
        const label =
          instrument.label ??
          [name, instrument.last4 && copy.endingIn(instrument.last4)].filter(Boolean).join(' ')

        return (
          <OptionCard
            key={instrument.id}
            value={instrument.id}
            label={label}
            description={
              instrument.description ??
              (instrument.expiry ? copy.expires(instrument.expiry) : undefined)
            }
            badge={instrument.expired ? copy.expired : undefined}
            media={instrument.icon ?? (instrument.brand ? icons?.[instrument.brand] : undefined)}
            disabled={instrument.disabled || instrument.expired}
          />
        )
      })}

      {allowNew ? <OptionCard value={NEW_INSTRUMENT_ID} label={copy.useAnother} /> : null}
    </OptionCardGroup>
  )
}
