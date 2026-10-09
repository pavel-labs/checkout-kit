import { describeProviderContract } from '@checkout-kit/conformance'
import { providerApiFixture } from '../../../test/provider-api'
import { adyenProvider } from './provider'

const fixture = providerApiFixture('adyen')
describeProviderContract({
  provider: adyenProvider,
  config: { baseUrl: 'http://payments.test/adyen' },
  ...fixture,
  instrumentFor: (scenario) => ({ kind: 'token', token: `pm_mock_${scenario}` }),
})
