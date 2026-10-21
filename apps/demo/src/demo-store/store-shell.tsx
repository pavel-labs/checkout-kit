import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { CheckoutRoot } from '@checkout-kit/react'
import { IconButton } from '@checkout-kit/ui'
import { useMerchant } from '@/entities/merchant'
import { CheckoutIcon } from '@/shared/ui/icons/checkout'
import './store.css'

const THEME_KEY = 'checkout-kit:demo-theme'

export function StoreShell({
  children,
  embedded = false,
}: {
  children: ReactNode
  embedded?: boolean
}) {
  const merchant = useMerchant()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // The appearance still works when browser storage is unavailable.
    }
  }, [theme])

  return (
    <CheckoutRoot theme={theme} className={`demo-store${embedded ? ' demo-store--embedded' : ''}`}>
      {!embedded ? (
        <>
          <a className="demo-skip" href="#demo-main">
            Skip to checkout
          </a>
          <header className="demo-header">
            <Link to="/" className="demo-brand" aria-label="Demo store home">
              <span className="demo-brand__mark" aria-hidden="true">
                ck.
              </span>
              <span>
                <strong>{merchant.name}</strong>
                <small>A checkout-kit example</small>
              </span>
            </Link>
            <nav className="demo-nav" aria-label="Demo navigation">
              <Link to="/gallery">
                UI Gallery <CheckoutIcon name="external" />
              </Link>
              <a href="https://pavel-labs.github.io/checkout-kit/">
                Docs <CheckoutIcon name="external" />
              </a>
              <IconButton
                label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                variant="secondary"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                <CheckoutIcon name={theme === 'light' ? 'moon' : 'sun'} />
              </IconButton>
            </nav>
          </header>
        </>
      ) : null}
      <main id="demo-main" className="demo-main">
        {children}
      </main>
      {!embedded ? (
        <footer className="demo-footer">
          <span>
            <span className="demo-live-dot" /> Demo environment · No real money moves
          </span>
          <a href="https://pavel-labs.github.io/checkout-kit/getting-started.html">
            Build your own checkout <CheckoutIcon name="arrow" />
          </a>
        </footer>
      ) : null}
    </CheckoutRoot>
  )
}
