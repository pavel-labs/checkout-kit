import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ErrorText, StatusText } from './feedback'

afterEach(cleanup)

describe('ErrorText', () => {
  // The one assertive region on the page. A decline has to interrupt whatever is being read.
  it('interrupts, because a decline is the answer the shopper is waiting for', () => {
    render(<ErrorText>Your card was declined.</ErrorText>)

    expect(screen.getByRole('alert').textContent).toBe('Your card was declined.')
  })

  it('renders nothing at all when there is no error', () => {
    const { container } = render(<ErrorText />)

    expect(container.firstChild).toBeNull()
  })

  it('takes an id, so a field can point at it', () => {
    render(<ErrorText id="pay-error">Declined</ErrorText>)

    expect(screen.getByRole('alert').id).toBe('pay-error')
  })
})

describe('StatusText', () => {
  // Deliberately silent: `<PaymentStatus>` owns the live region, and two of them would
  // talk over each other.
  it('says nothing to a screen reader on its own', () => {
    render(<StatusText>Paid on 3 March</StatusText>)

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Paid on 3 March')).toBeDefined()
  })

  it('carries a tone without changing what is announced', () => {
    const { container } = render(<StatusText tone="failure">Declined</StatusText>)

    expect(container.querySelector('.ck-status--failure')).not.toBeNull()
  })

  it('leaves neutral unmarked', () => {
    const { container } = render(<StatusText>Pending</StatusText>)

    expect(container.querySelector('.ck-status')!.className).toBe('ck-status')
  })
})
