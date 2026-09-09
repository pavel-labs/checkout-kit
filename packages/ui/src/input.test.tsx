import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Field } from './field'
import { Input } from './input'

afterEach(cleanup)

describe('Input', () => {
  it('claims nothing about validity by default', () => {
    render(<Input aria-label="Card number" />)

    expect(screen.getByLabelText('Card number').hasAttribute('aria-invalid')).toBe(false)
  })

  it('marks itself invalid on the `invalid` prop', () => {
    render(<Input aria-label="Card number" invalid />)

    expect(screen.getByLabelText('Card number').getAttribute('aria-invalid')).toBe('true')
  })

  // <Field> passes `aria-invalid: undefined` whenever it has no error. Spreading props after
  // the attribute let that undefined win, and the control silently claimed to be valid.
  it('stays invalid when a caller also passes an undefined aria-invalid', () => {
    render(<Input aria-label="Card number" invalid aria-invalid={undefined} />)

    expect(screen.getByLabelText('Card number').getAttribute('aria-invalid')).toBe('true')
  })

  it('is invalid inside a valid Field when asked directly', () => {
    render(<Field label="Card number">{(control) => <Input {...control} invalid />}</Field>)

    expect(screen.getByLabelText('Card number').getAttribute('aria-invalid')).toBe('true')
  })

  it('lets a Field error mark it invalid without the prop', () => {
    render(
      <Field label="Card number" error="Check the number">
        {(control) => <Input {...control} />}
      </Field>,
    )

    expect(screen.getByLabelText('Card number').getAttribute('aria-invalid')).toBe('true')
  })

  it('keeps the kit class alongside a caller class', () => {
    render(<Input aria-label="Card number" className="mine" />)

    expect(screen.getByLabelText('Card number').className).toBe('ck-input mine')
  })
})
