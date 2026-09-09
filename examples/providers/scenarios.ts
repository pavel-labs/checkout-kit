import {
  createBranded,
  type CheckoutEngine,
  type MountHandle,
  type PaymentInstrument,
  type PaymentResult,
} from '@checkout-kit/core'
import { createMount } from '@checkout-kit/runtime-browser'

export type ExampleProviderId =
  | 'stripe'
  | 'adyen'
  | 'paypal'
  | 'psp'
  | 'acquiring'
  | 'hpp'
  | 'hostedfields'
  | 'wallet'
  | 'transfer'

const card: PaymentInstrument = {
  kind: 'card',
  number: createBranded('4242424242424242'),
  exp: createBranded('12/30'),
  cvc: createBranded('123'),
  holder: 'Example Shopper',
}

const instrumentFor = (providerId: ExampleProviderId): PaymentInstrument => {
  switch (providerId) {
    case 'stripe':
    case 'adyen':
    case 'psp':
    case 'acquiring':
      return card
    case 'hostedfields':
      return { kind: 'hosted_session', sessionId: 'session-from-provider-frame' }
    case 'wallet':
      return { kind: 'wallet', walletId: 'your-wallet-sdk', payload: { token: 'wallet-token' } }
    case 'paypal':
    case 'hpp':
    case 'transfer':
      return { kind: 'none' }
  }
}

export const payWithProvider = async (
  engine: CheckoutEngine,
  providerId: ExampleProviderId,
  mount?: MountHandle | null,
): Promise<PaymentResult> => {
  await engine.useProvider(providerId)

  let result = await engine.pay({
    input: { planId: 'starter' },
    instrument: instrumentFor(providerId),
  })

  while (result.status === 'requires_action') {
    const action = engine.getSnapshot().action
    if (!action) throw new Error('The engine reported an action without storing it.')

    if (action.completion.via === 'return_url') {
      return result
    }

    result = await engine.runPendingAction({ mount })
  }

  return result
}

export const resumeFromReturnUrl = async (
  engine: CheckoutEngine,
  params: Readonly<Record<string, string>> = Object.fromEntries(
    new URL(window.location.href).searchParams,
  ),
) => engine.hydrate(params)

export const mountAction = (element: HTMLElement): MountHandle => createMount(element)

export const cancelCurrentPayment = (engine: CheckoutEngine) => engine.abort('user')

export const readCurrentPayment = (engine: CheckoutEngine) => {
  const intent = engine.getSnapshot().intent
  return intent ? engine.fetchIntent(intent.id) : null
}

export const resetCheckout = (engine: CheckoutEngine) => engine.reset()
