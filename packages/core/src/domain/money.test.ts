import { describe, expect, it } from 'vitest'
import { formatMoney, minorUnitsPerMajor } from './money'

describe('minorUnitsPerMajor', () => {
  it('knows the usual two-decimal currencies', () => {
    expect(minorUnitsPerMajor('USD')).toBe(100)
    expect(minorUnitsPerMajor('EUR')).toBe(100)
  })

  // The bug every hand-rolled formatter ships: dividing yen by 100.
  it('knows a currency with no minor unit', () => {
    expect(minorUnitsPerMajor('JPY')).toBe(1)
  })

  it('knows a three-decimal currency', () => {
    expect(minorUnitsPerMajor('KWD')).toBe(1000)
  })

  it('takes any case', () => {
    expect(minorUnitsPerMajor('usd')).toBe(100)
  })

  it('guesses two for a well-formed code it has never heard of', () => {
    expect(minorUnitsPerMajor('ZZZ')).toBe(100)
  })

  it('guesses two for a malformed code, rather than throwing', () => {
    expect(minorUnitsPerMajor('US')).toBe(100)
  })
})

describe('formatMoney', () => {
  it('converts minor units to major ones', () => {
    expect(formatMoney({ amount: 1999, currency: 'USD' }, { locale: 'en-US' })).toBe('$19.99')
  })

  it('does not divide a currency that has no minor unit', () => {
    expect(formatMoney({ amount: 1999, currency: 'JPY' }, { locale: 'en-US' })).toContain('1,999')
  })

  it('writes the amount the way the locale writes it', () => {
    const formatted = formatMoney({ amount: 1999, currency: 'EUR' }, { locale: 'de-DE' })

    // German puts the symbol last and separates decimals with a comma.
    expect(formatted).toContain('19,99')
    expect(formatted).toContain('€')
  })

  it('can show the code instead of the symbol, for currencies that share one', () => {
    expect(
      formatMoney({ amount: 1999, currency: 'USD' }, { locale: 'en-US', display: 'code' }),
    ).toContain('USD')
  })

  it('can leave the currency out, for a column that is already headed with it', () => {
    expect(
      formatMoney({ amount: 1999, currency: 'USD' }, { locale: 'en-US', display: 'none' }),
    ).toBe('19.99')
  })

  it('keeps the currency exponent when the symbol is left out', () => {
    expect(
      formatMoney({ amount: 1999, currency: 'JPY' }, { locale: 'en-US', display: 'none' }),
    ).toBe('1,999')
  })

  it('renders zero rather than an empty string', () => {
    expect(formatMoney({ amount: 0, currency: 'USD' }, { locale: 'en-US' })).toBe('$0.00')
  })

  it('renders a negative amount, because a refund line is still a line', () => {
    expect(formatMoney({ amount: -500, currency: 'USD' }, { locale: 'en-US' })).toContain('5.00')
  })

  // Intl takes any well-formed three-letter code and prints the code itself as the symbol,
  // so an unrecognised-but-valid currency needs no help from us. Asserted in parts because
  // Intl separates the two with a non-breaking space.
  it('prints an unrecognised but well-formed currency as its code', () => {
    const formatted = formatMoney({ amount: 1999, currency: 'ZZZ' }, { locale: 'en-US' })

    expect(formatted).toContain('ZZZ')
    expect(formatted).toContain('19.99')
  })

  // A total is not the place to throw a RangeError.
  it('falls back to the number and the code for a malformed currency', () => {
    expect(formatMoney({ amount: 1999, currency: 'US' }, { locale: 'en-US' })).toBe('19.99 US')
  })
})
