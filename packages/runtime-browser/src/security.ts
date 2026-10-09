/** Transport and destination rules for addresses received from a payment API. */
export interface PaymentUrlPolicy {
  /** Development only: permit HTTP on localhost, 127.0.0.1 and [::1]. */
  readonly allowInsecureLocalhost?: boolean
  /** Omit to allow HTTPS ACS/provider origins. An empty list denies all redirects. */
  readonly redirectOrigins?: readonly string[]
  /** Omit to allow HTTPS hosted fields. Use exact origins, without paths or wildcards. */
  readonly frameOrigins?: readonly string[]
  /** Action-supplied scripts are denied unless their exact origin is listed here. */
  readonly scriptOrigins?: readonly string[]
  readonly imageOrigins?: readonly string[]
  /** Custom bank app schemes, including the colon, e.g. ['bankapp:']. HTTPS always works. */
  readonly deeplinkProtocols?: readonly string[]
}

export type PaymentUrlUse = 'redirect' | 'frame' | 'script' | 'image' | 'deeplink' | 'return'

const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
const forbiddenProtocols = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'blob:',
  'about:',
  'intent:',
])

/** Throws a message without echoing URLs, query secrets or user information. */
export const validatePaymentUrl = (
  value: string,
  base: string,
  use: PaymentUrlUse,
  policy: PaymentUrlPolicy = {},
): URL => {
  let url: URL
  try {
    if (typeof value !== 'string' || !value.trim()) throw new Error()
    url = new URL(value, base)
  } catch {
    throw new Error('The payment URL is invalid.')
  }
  if (url.username || url.password) throw new Error('Payment URLs must not contain credentials.')
  if (forbiddenProtocols.has(url.protocol)) throw new Error('The payment URL scheme is unsafe.')

  const customDeeplink =
    use === 'deeplink' &&
    url.protocol !== 'http:' &&
    policy.deeplinkProtocols?.includes(url.protocol) === true
  const localHttp =
    url.protocol === 'http:' &&
    policy.allowInsecureLocalhost === true &&
    localHosts.has(url.hostname)
  if (url.protocol !== 'https:' && !localHttp && !customDeeplink)
    throw new Error('Payment URLs require HTTPS or an explicitly allowed bank app scheme.')

  const origins =
    use === 'script'
      ? (policy.scriptOrigins ?? [])
      : use === 'redirect'
        ? policy.redirectOrigins
        : use === 'frame'
          ? policy.frameOrigins
          : use === 'image'
            ? policy.imageOrigins
            : undefined
  if (origins && !origins.includes(url.origin))
    throw new Error(`The payment ${use} origin is not allowed.`)
  return url
}

/** A postMessage origin must identify one real HTTP(S) origin, never a wildcard or null. */
export const validateMessageOrigin = (origin: string, policy: PaymentUrlPolicy = {}): void => {
  const url = validatePaymentUrl(origin, origin, 'return', policy)
  if (url.origin !== origin) throw new Error('Payment messages require an exact origin.')
}
