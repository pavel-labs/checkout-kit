import { createCheckout, defineProvider } from '@checkout-kit/core'
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
import type { AcquiringConfig } from '@checkout-kit/provider-acquiring'
import type { BankTransferConfig } from '@checkout-kit/provider-bank-transfer'
import type { HostedFieldsConfig } from '@checkout-kit/provider-hosted-fields'
import type { HostedPageConfig } from '@checkout-kit/provider-hpp'
import type { PspConfig } from '@checkout-kit/provider-psp'
import type { WalletConfig } from '@checkout-kit/provider-wallet'
import type { AdyenConfig } from './adyen'
import type { PayPalConfig } from './paypal'
import type { StripeConfig } from './stripe'

export interface ExampleCheckoutOptions {
  apiBaseUrl: string
  acsOrigin: string
  fieldsOrigin: string
  adyenScriptUrl: string
}

export const createExampleCheckout = ({
  apiBaseUrl,
  acsOrigin,
  fieldsOrigin,
  adyenScriptUrl,
}: ExampleCheckoutOptions) =>
  (() => {
    const runtime = createBrowserRuntime({ returnPath: '/payment/return' })
    const providerApiRoot = apiBaseUrl.replace(/\/$/, '')

    return createCheckout({
      providers: [
        defineProvider({
          id: 'stripe',
            config: { baseUrl: `${providerApiRoot}/stripe` } satisfies StripeConfig,
          load: () => import('./stripe'),
          eager: true,
        }),
        defineProvider({
          id: 'adyen',
          config: {
            baseUrl: `${providerApiRoot}/adyen`,
            sdk: 'adyen',
            scriptUrl: adyenScriptUrl,
          } satisfies AdyenConfig,
          load: () => import('./adyen'),
        }),
        defineProvider({
          id: 'paypal',
            config: { baseUrl: providerApiRoot } satisfies PayPalConfig,
          load: () => import('./paypal'),
        }),
        defineProvider({
          id: 'psp',
          config: { baseUrl: apiBaseUrl, acsOrigin } satisfies PspConfig,
          load: () => import('@checkout-kit/provider-psp'),
        }),
        defineProvider({
          id: 'acquiring',
          config: {
            baseUrl: apiBaseUrl,
            userName: 'server-issued',
            password: 'server-issued',
            acsOrigin,
          } satisfies AcquiringConfig,
          load: () => import('@checkout-kit/provider-acquiring'),
        }),
        defineProvider({
          id: 'hpp',
          config: {
            baseUrl: apiBaseUrl,
            pageUrl: `${apiBaseUrl}/hosted-page`,
          } satisfies HostedPageConfig,
          load: () => import('@checkout-kit/provider-hpp'),
        }),
        defineProvider({
          id: 'hostedfields',
          config: {
            baseUrl: apiBaseUrl,
            fieldsUrl: `${apiBaseUrl}/hosted-fields`,
            fieldsOrigin,
          } satisfies HostedFieldsConfig,
          load: () => import('@checkout-kit/provider-hosted-fields'),
        }),
        defineProvider({
          id: 'wallet',
          config: {
            baseUrl: apiBaseUrl,
            sdk: 'your-wallet-sdk',
            scriptUrl: 'https://wallet.example/sdk.js',
            merchantName: 'Example Store',
          } satisfies WalletConfig,
          load: () => import('@checkout-kit/provider-wallet'),
        }),
        defineProvider({
          id: 'transfer',
          config: {
            baseUrl: apiBaseUrl,
            format: 'qr',
            instructions: 'Scan the code in your banking app.',
            poll: { intervalMs: 2000, timeoutMs: 10 * 60 * 1000 },
          } satisfies BankTransferConfig,
          load: () => import('@checkout-kit/provider-bank-transfer'),
        }),
      ],
      defaultProviderId: 'stripe',
      runners: runtime.runners,
      storage: runtime.storage,
      returnUrl: runtime.returnUrl,
    })
  })()
