import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { PaymentUiState } from '@checkout-kit/core'
import { PaymentButton } from './payment-button'

afterEach(cleanup)

const button = () => screen.getByRole('button')

describe('PaymentButton', () => {
  it('submits the form it sits in, so Enter in a field pays', () => {
    render(<PaymentButton state="idle">Pay</PaymentButton>)

    expect(button().getAttribute('type')).toBe('submit')
  })

  it.each<PaymentUiState>(['submitting', 'processing', 'requires_action'])(
    'reports itself busy while the payment is in flight (%s)',
    (state) => {
      render(<PaymentButton state={state}>Pay</PaymentButton>)

      expect(button().getAttribute('aria-busy')).toBe('true')
    },
  )

  it.each<PaymentUiState>(['idle', 'editing', 'validating', 'success', 'failure', 'cancelled'])(
    'is not busy when nothing is in flight (%s)',
    (state) => {
      render(<PaymentButton state={state}>Pay</PaymentButton>)

      expect(button().getAttribute('aria-busy')).toBeNull()
    },
  )

  // A label that changes mid-payment moves the target under the cursor, and the native
  // `disabled` attribute would drop focus to the top of the page.
  it('keeps its label and its focus while paying', () => {
    render(<PaymentButton state="processing">Pay $19.99</PaymentButton>)

    expect(button().textContent).toContain('Pay $19.99')
    expect(button().hasAttribute('disabled')).toBe(false)
  })

  it('keeps the amount in front of the shopper', () => {
    render(
      <PaymentButton state="idle" amount="$19.99">
        Pay
      </PaymentButton>,
    )

    expect(button().textContent).toContain('$19.99')
  })
})
