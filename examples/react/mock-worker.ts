import { setupWorker } from 'msw/browser'
import { handlers } from '@checkout-kit/testing/backend'

export const worker = setupWorker(...handlers)
