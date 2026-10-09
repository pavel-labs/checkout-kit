import { describeProviderContract } from '@checkout-kit/conformance'
import { providerApiFixture } from '../../../test/provider-api'
import { stripeProvider } from './provider'

const fixture = providerApiFixture('stripe')
describeProviderContract({
  provider: stripeProvider,
  config: { baseUrl: 'http://payments.test/stripe' },
  ...fixture,
  instrumentFor: (scenario) => ({ kind: 'token', token: `pm_mock_${scenario}` }),
})
