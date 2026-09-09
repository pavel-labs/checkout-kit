import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Checkbox } from './checkbox'

afterEach(cleanup)

describe('Checkbox', () => {
  it('is a real checkbox, found by its label', () => {
    render(<Checkbox label="Save this card" />)

    expect(screen.getByRole('checkbox', { name: 'Save this card' })).toBeDefined()
  })

  it('toggles from a click anywhere on the row, not just the box', () => {
    const onChange = vi.fn()
    render(<Checkbox label="I accept the terms" onChange={onChange} />)

    // The whole label is the target, which is what makes it hittable on a phone.
    fireEvent.click(screen.getByText('I accept the terms'))

    expect(onChange).toHaveBeenCalled()
  })

  it('reads the description out with the control', () => {
    render(<Checkbox label="Save this card" description="Stored by your payment provider" />)

    const box = screen.getByRole('checkbox')
    const describedBy = box.getAttribute('aria-describedby')!

    expect(document.getElementById(describedBy)?.textContent).toBe(
      'Stored by your payment provider',
    )
  })

  it('marks itself invalid and points at the error', () => {
    render(<Checkbox label="I accept the terms" error="You have to accept the terms" />)

    const box = screen.getByRole('checkbox')

    expect(box.getAttribute('aria-invalid')).toBe('true')
    expect(box.getAttribute('aria-describedby')).toBeTruthy()
  })

  // The payment owns the one assertive region; a missed checkbox must not talk over a decline.
  it('keeps its error polite', () => {
    render(<Checkbox label="I accept the terms" error="You have to accept the terms" />)

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('You have to accept the terms')
  })

  it('claims nothing about validity when there is no error', () => {
    render(<Checkbox label="Save this card" />)

    expect(screen.getByRole('checkbox').hasAttribute('aria-invalid')).toBe(false)
  })
})
