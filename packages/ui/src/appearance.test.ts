import { describe, expect, it } from 'vitest'
import { appearanceToAttributes, appearanceToStyle } from './appearance'

describe('appearanceToStyle', () => {
  // Moving the primitive is what carries the ramp: hover, pressed, subtle and focus are all
  // derived from it in CSS. Writing the semantic token instead would leave them behind.
  it('sets the accent primitive, so the whole ramp moves with it', () => {
    expect(appearanceToStyle({ accent: '#0a7' })).toEqual({ '--ck-p-accent-500': '#0a7' })
  })

  it('takes a number as pixels, for a token pipeline that stores bare numbers', () => {
    expect(appearanceToStyle({ radius: 8 })).toEqual({ '--ck-radius': '8px' })
  })

  it('leaves a string length alone', () => {
    expect(appearanceToStyle({ radius: '0.5rem' })).toEqual({ '--ck-radius': '0.5rem' })
  })

  it('writes nothing for what was not asked for', () => {
    expect(appearanceToStyle({})).toEqual({})
  })

  it('does not confuse density for a custom property', () => {
    expect(appearanceToStyle({ density: 'compact' })).toEqual({})
  })

  it('carries several properties at once', () => {
    expect(
      appearanceToStyle({ accent: '#0a7', font: 'Inter, sans-serif', controlHeight: 48 }),
    ).toEqual({
      '--ck-p-accent-500': '#0a7',
      '--ck-font': 'Inter, sans-serif',
      '--ck-control-height': '48px',
    })
  })
})

describe('appearanceToAttributes', () => {
  it('turns density into the attribute the stylesheet reads', () => {
    expect(appearanceToAttributes({ density: 'compact' })).toEqual({ 'data-ck-density': 'compact' })
  })

  it('says nothing when density was not asked for', () => {
    expect(appearanceToAttributes({ accent: '#0a7' })).toEqual({})
  })
})
