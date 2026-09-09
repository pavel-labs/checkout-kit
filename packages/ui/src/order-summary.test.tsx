import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Money } from './money'
import { OrderSummary } from './order-summary'

afterEach(cleanup)

describe('Money', () => {
  it('renders minor units as the shopper reads them', () => {
    render(<Money amount={1999} currency="USD" locale="en-US" />)

    expect(screen.getByText('$19.99')).toBeDefined()
  })
})

describe('OrderSummary', () => {
  const items = [
    { id: 'a', name: 'Team plan', amount: 9900, quantity: 2 },
    { id: 'b', name: 'Onboarding', amount: 0, value: 'Free' },
  ]

  it('names itself, so the summary is a landmark a screen reader can jump to', () => {
    render(<OrderSummary items={items} currency="USD" locale="en-US" />)

    expect(screen.getByRole('region', { name: 'Order summary' })).toBeDefined()
  })

  it('lists what is being bought', () => {
    render(<OrderSummary items={items} currency="USD" locale="en-US" />)

    expect(screen.getByText('Team plan')).toBeDefined()
    expect(screen.getByText('$99.00')).toBeDefined()
  })

  it('lets a line say something other than a number', () => {
    render(<OrderSummary items={items} currency="USD" locale="en-US" />)

    expect(screen.getByText('Free')).toBeDefined()
  })

  it('shows a quantity only when there is more than one', () => {
    render(<OrderSummary items={items} currency="USD" locale="en-US" />)

    expect(screen.getByText('×2')).toBeDefined()
    expect(screen.queryByText('×1')).toBeNull()
  })

  it('marks the total as the line the others add up to', () => {
    const { container } = render(
      <OrderSummary
        items={items}
        adjustments={[{ id: 'tax', name: 'Tax', amount: 1980 }]}
        total={{ id: 'total', name: 'Total due', amount: 21780 }}
        currency="USD"
        locale="en-US"
      />,
    )

    expect(container.querySelectorAll('.ck-item--total').length).toBe(1)
    expect(screen.getByText('$217.80')).toBeDefined()
  })

  it('can go without the card, for a page that already has one', () => {
    render(<OrderSummary items={items} currency="USD" locale="en-US" panel={false} />)

    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.getByText('Team plan')).toBeDefined()
  })

  it('formats every line in the same currency', () => {
    render(
      <OrderSummary
        total={{ id: 'total', name: 'Total', amount: 1999 }}
        currency="EUR"
        locale="de-DE"
      />,
    )

    expect(screen.getByText(/19,99/)).toBeDefined()
  })
})
