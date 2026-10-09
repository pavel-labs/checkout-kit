// Everything the engine needs that only a browser has, assembled in one place.

import {
  createRunnerRegistry,
  type MountHandle,
  type RunnerRegistry,
  type StorageAdapter,
} from '@checkout-kit/core'
import {
  createCollectFieldsRunner,
  type CollectFieldsRunnerOptions,
} from './runners/collect-fields'
import { createDisplayRunner, type DisplayRunnerOptions } from './runners/display'
import { createRedirectRunner, type RedirectRunnerOptions } from './runners/redirect'
import { createSdkHandoffRunner, type SdkHandoffRunnerOptions } from './runners/sdk-handoff'
import { sessionStorageAdapter } from './storage/session-storage'
import { validatePaymentUrl, type PaymentUrlPolicy } from './security'

export interface BrowserRuntime {
  readonly runners: RunnerRegistry
  readonly storage: StorageAdapter
  /** Absolute URL a provider sends the browser back to after a full-page redirect. */
  readonly returnUrl: string
  /** Query parameters of the current page, for picking a redirected payment back up. */
  readReturnParams(): Record<string, string>
}

export interface BrowserRuntimeOptions {
  /**
   * Path the provider returns to, resolved against the current origin. Pass the app's
   * base path with it - a deployment under a sub-path is exactly where hand-built return
   * URLs go wrong.
   */
  readonly returnPath: string
  readonly redirect?: Omit<RedirectRunnerOptions, 'security'>
  readonly collectFields?: Omit<CollectFieldsRunnerOptions, 'security'>
  readonly sdk?: Omit<SdkHandoffRunnerOptions, 'security'>
  readonly display?: Omit<DisplayRunnerOptions, 'security'>
  readonly storage?: StorageAdapter
  readonly security?: PaymentUrlPolicy
}

export const createBrowserRuntime = (options: BrowserRuntimeOptions): BrowserRuntime => {
  const returnUrl = validatePaymentUrl(
    options.returnPath,
    `${window.location.origin}/`,
    'return',
    options.security,
  )
  if (returnUrl.origin !== window.location.origin)
    throw new Error('The payment return URL must belong to this application origin.')
  const runners = createRunnerRegistry()
  runners.register(createRedirectRunner({ ...options.redirect, security: options.security }))
  runners.register(
    createCollectFieldsRunner({ ...options.collectFields, security: options.security }),
  )
  runners.register(createSdkHandoffRunner({ ...options.sdk, security: options.security }))
  runners.register(createDisplayRunner({ ...options.display, security: options.security }))

  return {
    runners,
    storage: options.storage ?? sessionStorageAdapter(),
    returnUrl: returnUrl.toString(),
    readReturnParams: () => Object.fromEntries(new URL(window.location.href).searchParams),
  }
}

/** Wraps a DOM element so a runner can render into it without the engine knowing about it. */
export const createMount = (element: HTMLElement): MountHandle => ({
  element,
  release: () => {
    element.replaceChildren()
  },
})
