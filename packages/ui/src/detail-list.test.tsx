import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { DetailItem, DetailList } from './detail-list'

afterEach(cleanup)

describe('DetailList', () => {
  // A <dl> is what pairs a name with its value for a screen reader. A pile of <div>s
  // reads as one run-on sentence.
  it('pairs each name with its value as a description list', () => {
    const { container } = render(
      <DetailList>
        <DetailItem name="Price" value="$19.99" />
        <DetailItem name="Total due" value="$19.99" total />
      </DetailList>,
    )

    const list = container.querySelector('dl')
    expect(list).not.toBeNull()
    expect(list!.querySelectorAll('dt').length).toBe(2)
    expect(list!.querySelectorAll('dd').length).toBe(2)
  })

  it('shows the name and the value', () => {
    render(
      <DetailList>
        <DetailItem name="Transaction ID" value="pi_123" />
      </DetailList>,
    )

    expect(screen.getByText('Transaction ID')).toBeDefined()
    expect(screen.getByText('pi_123')).toBeDefined()
  })

  it('marks the line the others add up to', () => {
    const { container } = render(
      <DetailList>
        <DetailItem name="Price" value="$19.99" />
        <DetailItem name="Total due" value="$19.99" total />
      </DetailList>,
    )

    expect(container.querySelectorAll('.ck-item--total').length).toBe(1)
  })
})
