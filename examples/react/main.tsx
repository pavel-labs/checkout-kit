import React from 'react'
import { createRoot } from 'react-dom/client'
import { CheckoutProvider } from '@checkout-kit/react'
import { App } from './App'
import { mockCheckout } from './mock-checkout'
import { worker } from './mock-worker'

await worker.start({ onUnhandledRequest: 'bypass' })

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CheckoutProvider engine={mockCheckout}>
      <App />
    </CheckoutProvider>
  </React.StrictMode>,
)
