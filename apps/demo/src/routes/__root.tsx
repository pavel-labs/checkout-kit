import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router'
import { CheckoutProvider } from '@checkout-kit/react'
import type { CheckoutEngine } from '@checkout-kit/core'
import { Main } from '@/shared/ui'
import { MerchantProvider, type MerchantConfig } from '@/entities/merchant'
import type { Plan } from '@/entities/plan'
import { StoreShell } from '@/demo-store/store-shell'

// Dependencies the composition root (app/providers/router) injects. Routes name
// what they need and depend on this shape only — never on a concrete adapter, so
// nothing below this file knows that the transport happens to be HTTP.
//
// The checkout engine arrives whole rather than as unwrapped callbacks: it is already the
// seam. Which plugin is behind it, how it talks to a bank and what authentication it
// needs are all invisible from here.
export interface RouterContext {
  getMerchantConfig: () => Promise<MerchantConfig>
  getPlans: () => Promise<Plan[]>
  checkout: CheckoutEngine
}

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: ({ context }) => context.getMerchantConfig(),
  component: RootComponent,
})

function RootComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isGallery = pathname.replace(/\/$/, '').endsWith('/gallery')
  const isEmbedded = pathname.replace(/\/$/, '').endsWith('/hosted-fields')
  const merchant = Route.useLoaderData()
  const { checkout } = Route.useRouteContext()

  return (
    <CheckoutProvider engine={checkout}>
      <MerchantProvider value={merchant}>
        {isGallery ? (
          <Main>
            <Outlet />
          </Main>
        ) : (
          <StoreShell embedded={isEmbedded}>
            <Outlet />
          </StoreShell>
        )}
      </MerchantProvider>
    </CheckoutProvider>
  )
}
