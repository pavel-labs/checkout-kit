// The kit is themed with CSS custom properties, and always will be - this is the typed door
// into them, for hosts whose brand lives in a design-token pipeline rather than a stylesheet.
//
// It writes the same properties you would write by hand. Nothing here is a second theming
// system: anything not covered is still one line of CSS on `.ck-root`.

import type { CSSProperties } from 'react'

export interface CheckoutAppearance {
  /**
   * The whole brand, in one value. Every hover, pressed, subtle and focus tone is derived
   * from it in CSS, so they move together and stay in step.
   */
  accent?: string
  /** Only when your brand's accent is light: what text on top of it should be. */
  accentContrast?: string

  /** The corner radius of the large controls. The smaller radii scale from the same idea. */
  radius?: string | number
  /** Buttons only - a pill button with square inputs is a deliberate look. */
  buttonRadius?: string | number

  font?: string
  fontMono?: string

  /** Height of the buttons and inputs. */
  controlHeight?: string | number
  /** `compact` tightens the gaps and the controls, for an embedded or WebView checkout. */
  density?: 'comfortable' | 'compact'

  surface?: string
  surfaceRaised?: string
  surfaceSunken?: string
  text?: string
  textMuted?: string
  border?: string

  danger?: string
  success?: string

  /** The focus ring, when the accent is not the right colour against your surfaces. */
  focusRing?: string
}

const length = (value: string | number | undefined): string | undefined =>
  value === undefined ? undefined : typeof value === 'number' ? `${value}px` : value

const VARS: Record<
  Exclude<keyof CheckoutAppearance, 'density'>,
  { property: string; transform?: (value: string | number) => string | undefined }
> = {
  // The primitive, not the semantic token: moving 500 is what carries the whole ramp.
  accent: { property: '--ck-p-accent-500' },
  accentContrast: { property: '--ck-accent-contrast' },
  radius: { property: '--ck-radius', transform: length },
  buttonRadius: { property: '--ck-button-radius', transform: length },
  font: { property: '--ck-font' },
  fontMono: { property: '--ck-font-mono' },
  controlHeight: { property: '--ck-control-height', transform: length },
  surface: { property: '--ck-surface' },
  surfaceRaised: { property: '--ck-surface-raised' },
  surfaceSunken: { property: '--ck-surface-sunken' },
  text: { property: '--ck-text' },
  textMuted: { property: '--ck-text-muted' },
  border: { property: '--ck-border' },
  danger: { property: '--ck-danger' },
  success: { property: '--ck-success' },
  focusRing: { property: '--ck-focus-ring-color' },
}

/**
 * Turns an appearance into the custom properties that express it.
 *
 * ```tsx
 * <CheckoutRoot theme="auto" style={appearanceToStyle({ accent: '#0a7', radius: 8 })}>
 * ```
 *
 * `density` is not a property but an attribute - see `appearanceAttributes`, or let
 * `<CheckoutRoot appearance={...}>` apply both.
 */
export const appearanceToStyle = (appearance: CheckoutAppearance): CSSProperties => {
  const style: Record<string, string> = {}

  for (const [key, spec] of Object.entries(VARS)) {
    const value = appearance[key as keyof typeof VARS]
    if (value === undefined) continue

    const resolved = spec.transform ? spec.transform(value) : String(value)
    if (resolved !== undefined) style[spec.property] = resolved
  }

  return style as CSSProperties
}

/** The part of an appearance that is an attribute rather than a custom property. */
export const appearanceToAttributes = (
  appearance: CheckoutAppearance,
): { 'data-ck-density'?: 'comfortable' | 'compact' } =>
  appearance.density ? { 'data-ck-density': appearance.density } : {}
