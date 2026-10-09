import { createRef } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Field } from './field'
import { IconButton } from './icon-button'
import { Input } from './input'
import { InputGroup } from './input-group'

afterEach(cleanup)

it('keeps the native input connected to its label, error and form ref through decoration', () => {
  const ref = createRef<HTMLInputElement>()
  render(
    <Field label="Email" error="Check your email">
      {(control) => (
        <InputGroup leading={<span>@</span>} trailing="USD">
          <Input {...control} ref={ref} />
        </InputGroup>
      )}
    </Field>,
  )
  const input = screen.getByRole('textbox', { name: 'Email' })
  expect(ref.current).toBe(input)
  expect(input.getAttribute('aria-invalid')).toBe('true')
  expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe(
    'Check your email',
  )
})

it('names an icon action and keeps it from submitting the surrounding form', () => {
  const clear = vi.fn()
  const submit = vi.fn()
  render(
    <form onSubmit={submit}>
      <InputGroup
        trailing={
          <IconButton label="Clear email" onClick={clear}>
            <svg>
              <title>Decorative close</title>
            </svg>
          </IconButton>
        }
      >
        <Input aria-label="Email" />
      </InputGroup>
    </form>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Clear email' }))
  expect(clear).toHaveBeenCalledTimes(1)
  expect(submit).not.toHaveBeenCalled()
  expect(screen.queryByRole('img')).toBeNull()
})
