import { useSyncExternalStore, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { detectPlatform, type Platform } from '@checkout-kit/runtime-browser'

export interface CheckoutRootProps {
  children: ReactNode
  /** `auto` follows the system. Unset means dark. */
  theme?: 'dark' | 'light' | 'auto'
  /** Pin it to override detection. */
  platform?: Platform | 'auto'
  /**
   * Custom properties, for a brand that lives in a token pipeline rather than a stylesheet.
   * `appearanceToStyle()` in @checkout-kit/ui builds one; plain CSS on `.ck-root` still works
   * and is the shorter path when the brand is already written down in CSS.
   */
  style?: CSSProperties
  /** `compact` tightens the layout - an embedded checkout, or one in a WebView. */
  density?: 'comfortable' | 'compact'
  className?: string
}

// Nothing to subscribe to: the platform does not change under a running page.
const subscribe = () => () => {}
// No navigator on the server, and no attribute beats a guess to hydrate over.
const onServer = () => null

/** The element kit styles are scoped under. Carries the theme and the platform. */
export const CheckoutRoot = ({
  children,
  theme,
  platform = 'auto',
  style,
  density,
  className,
}: CheckoutRootProps): ReactElement => {
  const detected = useSyncExternalStore(subscribe, detectPlatform, onServer)
  const resolved = platform === 'auto' ? detected : platform

  return (
    <div
      className={className ? `ck-root ${className}` : 'ck-root'}
      data-ck-theme={theme}
      data-ck-platform={resolved ?? undefined}
      data-ck-density={density}
      style={style}
    >
      {children}
    </div>
  )
}
