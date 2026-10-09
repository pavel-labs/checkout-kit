// The provider's own card fields, in its own frame. What crosses back is a token; the card
// number never enters our page.

import type { ActionEvidence, ActionRunner, PaymentAction, RunnerContext } from '@checkout-kit/core'
import { awaitPostMessage } from '../watchers/post-message'
import { validateMessageOrigin, validatePaymentUrl, type PaymentUrlPolicy } from '../security'

type CollectFieldsAction = Extract<PaymentAction, { kind: 'collect_fields' }>

export interface CollectFieldsRunnerOptions {
  readonly security?: PaymentUrlPolicy
  readonly frameTitle?: (action: CollectFieldsAction) => string
  /**
   * No `allow-forms` and no `allow-top-navigation`: the field frame talks to its provider
   * with fetch and answers with postMessage, so it has no business submitting anything or
   * moving the page underneath it.
   */
  readonly sandbox?: string
}

const DEFAULT_SANDBOX = 'allow-scripts allow-same-origin'

const buildUrl = (action: CollectFieldsAction, returnUrl: string): string => {
  const url = new URL(action.url, returnUrl)
  url.searchParams.set('actionId', action.id)
  url.searchParams.set('fields', action.fields.join(','))
  for (const [name, value] of Object.entries(action.theme ?? {})) {
    url.searchParams.set(`theme.${name}`, value)
  }
  return url.toString()
}

export const createCollectFieldsRunner = (
  options: CollectFieldsRunnerOptions = {},
): ActionRunner<'collect_fields'> => ({
  kind: 'collect_fields',
  surfaces: ['inline'],

  run: async (action, ctx: RunnerContext): Promise<ActionEvidence> => {
    let url: URL
    try {
      url = validatePaymentUrl(action.url, ctx.returnUrl, 'frame', options.security)
      validateMessageOrigin(action.origin, options.security)
      if (url.origin !== action.origin)
        throw new Error('Hosted fields and their message origin must match.')
      if (action.completion.via !== 'post_message' || action.completion.origin !== action.origin)
        throw new Error('Hosted fields require matching postMessage completion.')
    } catch (cause) {
      return { via: 'aborted', actionId: action.id, reason: 'runner_error', cause }
    }
    const mount = ctx.mount?.element
    if (!(mount instanceof HTMLElement)) {
      return {
        via: 'aborted',
        actionId: action.id,
        reason: 'runner_error',
        cause: new Error('Hosted fields need somewhere to render; no mount point was given.'),
      }
    }

    const frame = document.createElement('iframe')
    frame.title = options.frameTitle?.(action) ?? 'Card details'
    frame.referrerPolicy = 'no-referrer'
    frame.setAttribute('sandbox', options.sandbox ?? DEFAULT_SANDBOX)
    frame.style.width = '100%'
    frame.style.height = '100%'
    frame.style.border = '0'
    mount.append(frame)

    // Listening before the frame is attached: it may answer as soon as it loads.
    const evidence = awaitPostMessage({
      actionId: action.id,
      origin: action.origin,
      source: frame.contentWindow,
      type: action.completion.via === 'post_message' ? action.completion.type : 'ck-fields-token',
      correlationField:
        action.completion.via === 'post_message' ? action.completion.correlationField : undefined,
      signal: ctx.signal,
      deadline: ctx.deadline,
    })

    frame.src = buildUrl({ ...action, url: url.toString() }, ctx.returnUrl)
    ctx.report({ stage: 'collecting', detail: action.origin })

    try {
      return await evidence
    } finally {
      frame.remove()
    }
  },
})
