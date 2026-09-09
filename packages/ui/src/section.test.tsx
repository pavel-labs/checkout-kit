import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Panel } from './panel'
import { Section } from './section'

afterEach(cleanup)

describe('Section', () => {
  it('renders its children without asking for a title', () => {
    render(
      <Section>
        <p>Card details</p>
      </Section>,
    )

    expect(screen.getByText('Card details')).toBeDefined()
  })

  it('heads the group with a level-2 heading', () => {
    render(
      <Section title="Billing address">
        <p>fields</p>
      </Section>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Billing address' })).toBeDefined()
  })

  it('drops a level when the page nests it deeper', () => {
    render(
      <Section title="Billing address" headingLevel="h3">
        <p>fields</p>
      </Section>,
    )

    expect(screen.getByRole('heading', { level: 3, name: 'Billing address' })).toBeDefined()
  })

  // A `<section>` is only a landmark once something names it, which is what lets a screen
  // reader list the parts of a checkout and jump between them.
  it('becomes a named landmark when it has a title', () => {
    render(
      <Section title="Billing address">
        <p>fields</p>
      </Section>,
    )

    expect(screen.getByRole('region', { name: 'Billing address' })).toBeDefined()
  })

  it('is not a landmark without one, so an unnamed group adds no noise', () => {
    render(
      <Section>
        <p>fields</p>
      </Section>,
    )

    expect(screen.queryByRole('region')).toBeNull()
  })

  it('reads the description out under the title', () => {
    render(
      <Section title="Billing address" description="As it appears on your statement">
        <p>fields</p>
      </Section>,
    )

    expect(screen.getByText('As it appears on your statement')).toBeDefined()
  })
})

describe('Panel', () => {
  it('names itself the same way a section does', () => {
    render(
      <Panel title="Order summary">
        <p>lines</p>
      </Panel>,
    )

    expect(screen.getByRole('region', { name: 'Order summary' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 2, name: 'Order summary' })).toBeDefined()
  })

  it('puts an aside beside the title', () => {
    render(
      <Panel title="Order summary" aside="3 items">
        <p>lines</p>
      </Panel>,
    )

    expect(screen.getByText('3 items')).toBeDefined()
  })

  it('draws a bare surface when there is nothing to head it with', () => {
    render(
      <Panel>
        <p>lines</p>
      </Panel>,
    )

    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getByText('lines')).toBeDefined()
  })
})
