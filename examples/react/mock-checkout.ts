import { createCheckout, defineProvider } from '@checkout-kit/core'
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
import type { AcquiringConfig } from '@checkout-kit/provider-acquiring'
import type { BankTransferConfig } from '@checkout-kit/provider-bank-transfer'
import type { HostedFieldsConfig } from '@checkout-kit/provider-hosted-fields'
import type { HostedPageConfig } from '@checkout-kit/provider-hpp'
import type { PspConfig } from '@checkout-kit/provider-psp'
import type { WalletConfig } from '@checkout-kit/provider-wallet'
import type { AdyenConfig } from '../providers/adyen'
import type { PayPalConfig } from '../providers/paypal'
import type { StripeConfig } from '../providers/stripe'

const realProviderBaseUrl = import.meta.env.VITE_REAL_PROVIDER_API_BASE_URL
const realApiRoot = realProviderBaseUrl?.replace(/\/$/, '')

/** Where a provider that takes the whole tab sends the shopper back. */
export const RETURN_PATH = '/payment/return'

export const runtime = createBrowserRuntime({
  returnPath: RETURN_PATH,
  sdk: {
    adapters: [{ sdk: 'mock-wallet', request: async () => ({ walletToken: 'mock-wallet-token' }) }],
  },
})

export const mockCheckout = createCheckout({
  providers: [
    ...(realApiRoot
      ? [
          defineProvider({
            id: 'stripe',
            config: { baseUrl: `${realApiRoot}/stripe` } satisfies StripeConfig,
            load: () => import('../providers/stripe'),
            eager: true,
          }),
          defineProvider({
            id: 'adyen',
            config: {
              baseUrl: `${realApiRoot}/adyen`,
              sdk: 'adyen',
              scriptUrl: import.meta.env.VITE_ADYEN_SCRIPT_URL ?? '',
            } satisfies AdyenConfig,
            load: () => import('../providers/adyen'),
          }),
          defineProvider({
            id: 'paypal',
            config: { baseUrl: realApiRoot } satisfies PayPalConfig,
            load: () => import('../providers/paypal'),
          }),
        ]
      : []),
    defineProvider({
      id: 'psp',
      config: { baseUrl: '/api', acsOrigin: 'https://localhost:5100' } satisfies PspConfig,
      load: () => import('@checkout-kit/provider-psp'),
      eager: true,
    }),
    defineProvider({
      id: 'acquiring',
      config: {
        baseUrl: '/acquiring',
        userName: 'demo-api',
        password: 'demo',
        acsOrigin: 'https://localhost:5100',
      } satisfies AcquiringConfig,
      load: () => import('@checkout-kit/provider-acquiring'),
    }),
    defineProvider({
      id: 'hpp',
      config: { baseUrl: '/api', pageUrl: '/hosted-page' } satisfies HostedPageConfig,
      load: () => import('@checkout-kit/provider-hpp'),
    }),
    defineProvider({
      id: 'hostedfields',
      config: {
        baseUrl: '/api',
        fieldsUrl: '/hosted-fields',
        fieldsOrigin: window.location.origin,
      } satisfies HostedFieldsConfig,
      load: () => import('@checkout-kit/provider-hosted-fields'),
    }),
    defineProvider({
      id: 'wallet',
      config: {
        baseUrl: '/api',
        sdk: 'mock-wallet',
        scriptUrl: '',
        merchantName: 'Mock Store',
      } satisfies WalletConfig,
      load: () => import('@checkout-kit/provider-wallet'),
    }),
    defineProvider({
      id: 'transfer',
      config: {
        baseUrl: '/api',
        format: 'qr',
        instructions: 'Scan this mock QR code in your banking app.',
        poll: { intervalMs: 500, timeoutMs: 10_000 },
      } satisfies BankTransferConfig,
      load: () => import('@checkout-kit/provider-bank-transfer'),
    }),
  ],
  defaultProviderId: 'psp',
  runners: runtime.runners,
  storage: runtime.storage,
  returnUrl: runtime.returnUrl,
})
