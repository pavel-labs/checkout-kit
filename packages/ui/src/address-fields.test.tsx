import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AddressFields } from './address-fields'
import { ContactFields } from './contact-fields'

afterEach(cleanup)

const COUNTRIES = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
]

const renderAddress = (props: Partial<Parameters<typeof AddressFields>[0]> = {}) =>
  render(<AddressFields value={{}} onChange={() => {}} countries={COUNTRIES} {...props} />)

describe('AddressFields', () => {
  it('labels every field, so autofill and a screen reader both know what they are', () => {
    renderAddress()

    expect(screen.getByLabelText(/Country/)).toBeDefined()
    expect(screen.getByLabelText(/^Address/)).toBeDefined()
    expect(screen.getByLabelText(/City/)).toBeDefined()
    expect(screen.getByLabelText(/Postal code/)).toBeDefined()
  })

  // A wrong autocomplete token silently turns filling off for the whole form, which is why
  // these are the component's job and not each consumer's.
  it('uses the autofill tokens a browser actually recognises', () => {
    renderAddress()

    expect(screen.getByLabelText(/^Address/).getAttribute('autocomplete')).toBe(
      'billing address-line1',
    )
    expect(screen.getByLabelText(/City/).getAttribute('autocomplete')).toBe(
      'billing address-level2',
    )
    expect(screen.getByLabelText(/Postal code/).getAttribute('autocomplete')).toBe(
      'billing postal-code',
    )
  })

  it('fills a shipping address into its own autofill section', () => {
    renderAddress({ autoCompleteSection: 'shipping' })

    expect(screen.getByLabelText(/^Address/).getAttribute('autocomplete')).toBe(
      'shipping address-line1',
    )
  })

  it('offers the countries it was given and nothing of its own', () => {
    renderAddress()

    // Two countries plus the placeholder.
    expect(screen.getAllByRole('option').length).toBe(3)
    expect(screen.getByRole('option', { name: 'United Kingdom' })).toBeDefined()
  })

  it('drops the fields a provider does not ask for', () => {
    renderAddress({ fields: ['country', 'postalCode'] })

    expect(screen.getByLabelText(/Country/)).toBeDefined()
    expect(screen.queryByLabelText(/City/)).toBeNull()
  })

  it('reports a change against the field that changed', () => {
    const onChange = vi.fn()
    renderAddress({ value: { city: 'London' }, onChange })

    fireEvent.change(screen.getByLabelText(/^Address/), { target: { value: '1 High St' } })

    expect(onChange).toHaveBeenCalledWith({ city: 'London', line1: '1 High St' })
  })

  it('marks only the field that has an error', () => {
    renderAddress({ errors: { postalCode: 'That postcode is not valid' } })

    expect(screen.getByLabelText(/Postal code/).getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByLabelText(/City/).hasAttribute('aria-invalid')).toBe(false)
  })

  it('takes its wording from the host', () => {
    renderAddress({ labels: { legend: 'Adresse de facturation', city: 'Ville' } })

    expect(screen.getByLabelText(/Ville/)).toBeDefined()
  })
})

describe('ContactFields', () => {
  it('asks for an email with the right keyboard and autofill', () => {
    render(<ContactFields value={{}} onChange={() => {}} />)

    const email = screen.getByLabelText(/Email/)

    expect(email.getAttribute('type')).toBe('email')
    expect(email.getAttribute('autocomplete')).toBe('email')
    expect(email.getAttribute('inputmode')).toBe('email')
  })

  it('leaves the phone out when it is not asked for', () => {
    render(<ContactFields value={{}} onChange={() => {}} fields={['email']} />)

    expect(screen.queryByLabelText(/Phone/)).toBeNull()
  })

  it('reports a change without dropping the other field', () => {
    const onChange = vi.fn()
    render(<ContactFields value={{ phone: '+441234' }} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'a@b.test' } })

    expect(onChange).toHaveBeenCalledWith({ phone: '+441234', email: 'a@b.test' })
  })
})
