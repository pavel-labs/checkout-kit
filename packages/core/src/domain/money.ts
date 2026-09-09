// Amounts cross the wire in minor units and have to reach a shopper in major ones. `Intl`
// already knows how many minor units each currency has, so this is a conversion rather than
// a table of exponents to keep up to date.

/** An amount as it travels: minor units, plus the currency that says how many those are. */
export interface Money {
  /** Minor units - 1999 is $19.99, and 1999 is also ¥1999, because JPY has no minor unit. */
  readonly amount: number
  /** ISO 4217, in any case. */
  readonly currency: string
}

export interface FormatMoneyOptions {
  /** Defaults to the runtime's locale, which on a server is rarely the shopper's. */
  readonly locale?: string
  /** `symbol` is "$19.99", `code` is "USD 19.99", `none` is "19.99". */
  readonly display?: 'symbol' | 'code' | 'none'
}

/** 100 for USD, 1 for JPY, 1000 for KWD. Asked of `Intl`, not hardcoded. */
export const minorUnitsPerMajor = (currency: string): number => {
  const digits = currencyDigits(currency)
  return 10 ** digits
}

const DEFAULT_DIGITS = 2

const currencyDigits = (currency: string): number => {
  try {
    const { maximumFractionDigits } = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).resolvedOptions()

    return maximumFractionDigits ?? DEFAULT_DIGITS
  } catch {
    // Malformed - Intl takes any three letters, so this is 'US' or worse. Two is the common
    // case, and beats throwing on a screen whose only job is a total.
    return DEFAULT_DIGITS
  }
}

/**
 * Renders a minor-unit amount the way the locale writes it - where the symbol goes and which
 * character separates the decimals both move by locale.
 *
 * ```ts
 * formatMoney({ amount: 1999, currency: 'USD' }, { locale: 'en-US' }) // '$19.99'
 * formatMoney({ amount: 1999, currency: 'EUR' }, { locale: 'de-DE' }) // '19,99 €'
 * formatMoney({ amount: 1999, currency: 'JPY' }, { locale: 'ja-JP' }) // '￥1,999'
 * ```
 */
export const formatMoney = (
  { amount, currency }: Money,
  { locale, display = 'symbol' }: FormatMoneyOptions = {},
): string => {
  const code = currency.toUpperCase()
  const major = amount / minorUnitsPerMajor(code)

  try {
    return new Intl.NumberFormat(locale, {
      style: display === 'none' ? 'decimal' : 'currency',
      currency: code,
      currencyDisplay: display === 'code' ? 'code' : 'symbol',
      // `decimal` does not take the currency's exponent, so it has to be asked for.
      ...(display === 'none'
        ? {
            minimumFractionDigits: currencyDigits(code),
            maximumFractionDigits: currencyDigits(code),
          }
        : {}),
    }).format(major)
  } catch {
    // A currency `Intl` refuses outright. Show the number rather than nothing.
    return `${major.toFixed(currencyDigits(code))} ${code}`
  }
}
