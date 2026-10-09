import { describeProviderContract } from '@checkout-kit/conformance'
import { providerApiFixture } from '../../../test/provider-api'
import { payPalProvider } from './provider'

const fixture = providerApiFixture('paypal')
describeProviderContract({
  provider: payPalProvider,
  config: { baseUrl: 'http://payments.test/paypal' },
  ...fixture,
  instrumentFor: () => ({ kind: 'none' }),
})
