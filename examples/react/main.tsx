import React from 'react'
import { createRoot } from 'react-dom/client'
import { CheckoutProvider, CheckoutRoot } from '@checkout-kit/react'
// One stylesheet, no framework. Everything below is scoped under <CheckoutRoot>.
import '@checkout-kit/ui/styles.css'
import './styles.css'
import { App } from './App'
import { mockCheckout } from './mock-checkout'
import { worker } from './mock-worker'

await worker.start({ onUnhandledRequest: 'bypass' })

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CheckoutProvider engine={mockCheckout}>
      {/* `auto` follows the system; the platform is detected. Pin either to check a layout. */}
      <CheckoutRoot theme="auto">
        <App />
      </CheckoutRoot>
    </CheckoutProvider>
  </React.StrictMode>,
)
