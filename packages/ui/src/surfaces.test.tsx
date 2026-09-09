import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Dialog } from './dialog'
import { Disclosure } from './disclosure'
import { Divider } from './divider'
import { ExpressCheckout } from './express-checkout'
import { PromoCodeInput } from './promo-code'
import { NEW_INSTRUMENT_ID, SavedInstrumentList } from './saved-instrument'
import { Steps } from './steps'
import { ValidationSummary } from './validation-summary'

afterEach(cleanup)

describe('Divider', () => {
  it('is a plain rule with nothing to say', () => {
    const { container } = render(<Divider />)

    expect(container.querySelector('hr')).not.toBeNull()
  })

  it('names itself when it carries a word', () => {
    render(<Divider>or</Divider>)

    expect(screen.getByRole('separator').textContent).toBe('or')
  })
})

describe('Disclosure', () => {
  it('is a native details, closed until asked', () => {
    const { container } = render(<Disclosure summary="What is a CVC?">Three digits.</Disclosure>)

    expect(container.querySelector('details')!.open).toBe(false)
    expect(screen.getByText('What is a CVC?')).toBeDefined()
  })

  it('can start open', () => {
    const { container } = render(
      <Disclosure summary="What is a CVC?" defaultOpen>
        Three digits.
      </Disclosure>,
    )

    expect(container.querySelector('details')!.open).toBe(true)
  })
})

describe('ExpressCheckout', () => {
  it('groups the wallet buttons under a name', () => {
    render(
      <ExpressCheckout>
        <button type="button">Apple Pay</button>
      </ExpressCheckout>,
    )

    expect(screen.getByRole('group', { name: 'Express checkout' })).toBeDefined()
  })

  it('rules the row off from the form below it', () => {
    render(
      <ExpressCheckout>
        <button type="button">Apple Pay</button>
      </ExpressCheckout>,
    )

    expect(screen.getByRole('separator').textContent).toBe('or')
  })

  it('can go without the rule', () => {
    render(
      <ExpressCheckout dividerLabel={null}>
        <button type="button">Apple Pay</button>
      </ExpressCheckout>,
    )

    expect(screen.queryByRole('separator')).toBeNull()
  })
})

describe('PromoCodeInput', () => {
  it('will not apply an empty code', () => {
    const onApply = vi.fn()
    render(<PromoCodeInput value="" onChange={() => {}} onApply={onApply} />)

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).not.toHaveBeenCalled()
  })

  it('applies a trimmed code on Enter, without submitting the form around it', () => {
    const onApply = vi.fn()
    render(<PromoCodeInput value=" SAVE10 " onChange={() => {}} onApply={onApply} />)

    fireEvent.keyDown(screen.getByLabelText('Promo code'), { key: 'Enter' })

    expect(onApply).toHaveBeenCalledWith('SAVE10')
  })

  it('shows the code that stuck, and offers to take it off', () => {
    const onRemove = vi.fn()
    render(
      <PromoCodeInput
        value=""
        onChange={() => {}}
        onApply={() => {}}
        applied="SAVE10"
        onRemove={onRemove}
      />,
    )

    expect(screen.getByText('SAVE10')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onRemove).toHaveBeenCalled()
  })

  it('marks the field invalid and keeps the message polite', () => {
    render(
      <PromoCodeInput value="NOPE" onChange={() => {}} onApply={() => {}} error="Unknown code" />,
    )

    expect(screen.getByLabelText('Promo code').getAttribute('aria-invalid')).toBe('true')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('SavedInstrumentList', () => {
  const instruments = [
    { id: 'pm_1', brand: 'visa' as const, last4: '4242', expiry: '12/30' },
    { id: 'pm_2', brand: 'amex' as const, last4: '0005', expiry: '01/20', expired: true },
  ]

  it('builds the label from the brand and the last four', () => {
    render(<SavedInstrumentList instruments={instruments} value={null} onChange={() => {}} />)

    expect(screen.getByRole('radio', { name: /Visa ending in 4242/ })).toBeDefined()
  })

  it('shows an expired card, disabled, rather than hiding it', () => {
    render(<SavedInstrumentList instruments={instruments} value={null} onChange={() => {}} />)

    const expired = screen.getByRole('radio', { name: /0005/ }) as HTMLInputElement

    expect(expired.disabled).toBe(true)
  })

  it('offers a way to pay with something new', () => {
    const onChange = vi.fn()
    render(<SavedInstrumentList instruments={instruments} value={null} onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Use another payment method' }))

    expect(onChange).toHaveBeenCalledWith(NEW_INSTRUMENT_ID)
  })

  it('can insist on a saved card', () => {
    render(
      <SavedInstrumentList
        instruments={instruments}
        value={null}
        onChange={() => {}}
        allowNew={false}
      />,
    )

    expect(screen.queryByRole('radio', { name: 'Use another payment method' })).toBeNull()
  })
})

describe('Steps', () => {
  const steps = [
    { id: 'contact', label: 'Contact' },
    { id: 'address', label: 'Address' },
    { id: 'pay', label: 'Pay' },
  ]

  it('says where the shopper is, in words rather than in colour', () => {
    render(<Steps steps={steps} current="address" />)

    expect(screen.getByText('Step 2 of 3')).toBeDefined()
  })

  it('marks the current step for a screen reader', () => {
    const { container } = render(<Steps steps={steps} current="address" />)

    expect(container.querySelector('[aria-current="step"]')!.textContent).toContain('Address')
  })

  // Not tabs: these are not panels you can switch between, and calling them tabs would
  // promise arrow keys that do not exist.
  it('is a navigation, not a tab list', () => {
    render(<Steps steps={steps} current="address" />)

    expect(screen.getByRole('navigation', { name: 'Checkout progress' })).toBeDefined()
    expect(screen.queryByRole('tablist')).toBeNull()
  })
})

describe('ValidationSummary', () => {
  it('renders nothing when the form is clean', () => {
    const { container } = render(<ValidationSummary problems={[]} />)

    expect(container.firstChild).toBeNull()
  })

  it('interrupts with a count, because submit is when it appears', () => {
    render(<ValidationSummary problems={[{ message: 'Enter a card number' }]} />)

    expect(screen.getByRole('alert').textContent).toContain('There is 1 problem')
  })

  it('pluralises', () => {
    render(<ValidationSummary problems={[{ message: 'One' }, { message: 'Two' }]} />)

    expect(screen.getByRole('alert').textContent).toContain('There are 2 problems')
  })

  it('links each problem to the field it came from', () => {
    render(
      <ValidationSummary problems={[{ fieldId: 'card-number', message: 'Enter a card number' }]} />,
    )

    expect(screen.getByRole('link', { name: 'Enter a card number' }).getAttribute('href')).toBe(
      '#card-number',
    )
  })

  it('takes focus, so the count is what gets read on submit', () => {
    render(<ValidationSummary problems={[{ message: 'Enter a card number' }]} />)

    expect(document.activeElement).toBe(screen.getByRole('alert'))
  })
})

describe('Dialog', () => {
  it('names itself from its title', () => {
    render(
      <Dialog open onClose={() => {}} title="Why do you need this?">
        Because your bank asks for it.
      </Dialog>,
    )

    expect(screen.getByRole('dialog', { name: 'Why do you need this?' })).toBeDefined()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Confirm">
        body
      </Dialog>,
    )

    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))

    expect(onClose).toHaveBeenCalled()
  })

  it('refuses to close when the shopper has to answer', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Confirm" dismissible={false}>
        body
      </Dialog>,
    )

    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))

    expect(onClose).not.toHaveBeenCalled()
  })
})
