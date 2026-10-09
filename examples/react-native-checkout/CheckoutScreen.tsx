import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Linking, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { WebView, type WebViewNavigation } from 'react-native-webview'
import {
  createCheckoutMessageHandler,
  createBridgeCommand,
  createCommandScript,
  type CheckoutMessageHandler,
  createNavigationPolicy,
  parseReturnDeepLink,
} from '@checkout-kit/webview-bridge/host'
import type { BridgeEvent } from '@checkout-kit/webview-bridge/protocol'
import type { PaymentUiState } from '@checkout-kit/core'

// The checkout is the web app, opened in a WebView. This screen owns the chrome around it,
// the navigation rules, and what happens when the payment finishes.

const CHECKOUT_URL = 'https://pay.example.com/checkout'
const RETURN_SCHEME = 'myapp'
const NO_PROVIDER_URLS: readonly string[] = []
const merchantPolicy = createNavigationPolicy({ allow: [CHECKOUT_URL] })

const HEADINGS: Partial<Record<PaymentUiState, string>> = {
  idle: 'Checkout',
  editing: 'Checkout',
  submitting: 'Sending your payment',
  processing: 'Confirming your payment',
  requires_action: 'Confirm with your bank',
  success: 'Paid',
  failure: 'Payment failed',
  cancelled: 'Payment cancelled',
}

interface CheckoutScreenProps {
  onDone: (outcome: 'success' | 'failure' | 'cancelled') => void
  /** Provider pages permitted to complete top-window redirects inside this WebView. */
  allowedProviderUrls?: readonly string[]
}

export const CheckoutScreen = ({
  onDone,
  allowedProviderUrls = NO_PROVIDER_URLS,
}: CheckoutScreenProps) => {
  const webview = useRef<WebView>(null)
  const [state, setState] = useState<PaymentUiState>('idle')
  const [ready, setReady] = useState(false)
  const session = useRef<string | null>(null)
  const sequence = useRef(0)
  const handleMessage = useRef<CheckoutMessageHandler | null>(null)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  }, [onDone])
  const pendingReturn = useRef<Record<string, string> | null>(null)

  const policy = useMemo(
    () =>
      createNavigationPolicy({
        // Only the checkout runs in here. Everything else is either opened outside or
        // refused: a WebView with no policy will follow any link the page offers.
        allow: [CHECKOUT_URL, ...allowedProviderUrls],
        openExternally: ['https://help.example.com'],
        returnScheme: RETURN_SCHEME,
      }),
    [allowedProviderUrls],
  )

  const send = useCallback(
    (type: 'PAYMENT_CANCEL' | 'PAYMENT_RESUME', params?: Record<string, string>) => {
      if (!session.current) {
        if (type === 'PAYMENT_RESUME') pendingReturn.current = params ?? {}
        return
      }
      const options = { sessionId: session.current, id: `native:${++sequence.current}` }
      const command =
        type === 'PAYMENT_RESUME'
          ? createBridgeCommand(type, { params: params ?? {} }, options)
          : createBridgeCommand(type, {}, options)
      webview.current?.injectJavaScript(createCommandScript(command))
    },
    [],
  )

  const onReady = useCallback(
    (event: Extract<BridgeEvent, { type: 'PAYMENT_READY' }>) => {
      session.current = event.sessionId
      setReady(true)
      if (pendingReturn.current) {
        send('PAYMENT_RESUME', pendingReturn.current)
        pendingReturn.current = null
      }
    },
    [send],
  )

  useEffect(() => {
    handleMessage.current = createCheckoutMessageHandler({
      PAYMENT_READY: onReady,
      PAYMENT_STATE_CHANGED: (event) => setState(event.payload.state),
      PAYMENT_SUCCEEDED: () => done.current('success'),
      PAYMENT_DECLINED: (event) => {
        Alert.alert('Payment declined', event.payload.message)
        done.current('failure')
      },
      PAYMENT_FAILED: () => done.current('failure'),
      PAYMENT_CANCELLED: () => done.current('cancelled'),
    })
    return () => {
      handleMessage.current = null
    }
  }, [onReady])

  // The fallback path: a bank that refuses to be framed sends the shopper out to a browser,
  // and the app comes back through its own deep link.
  useEffect(() => {
    let active = true
    const resumeReturn = ({ url }: { url: string }) => {
      if (!active) return
      const params = parseReturnDeepLink(url, { scheme: RETURN_SCHEME, path: 'payment/return' })
      if (params) send('PAYMENT_RESUME', params)
    }
    const subscription = Linking.addEventListener('url', resumeReturn)
    void Linking.getInitialURL().then((url) => {
      if (url) resumeReturn({ url })
    })

    return () => {
      active = false
      subscription.remove()
    }
  }, [send])

  const decide = (request: WebViewNavigation): boolean => {
    const decision = policy.decide(request.url)

    if (decision === 'external') void Linking.openURL(request.url)
    if (decision === 'return') {
      const params = parseReturnDeepLink(request.url, {
        scheme: RETURN_SCHEME,
        path: 'payment/return',
      })
      if (params) send('PAYMENT_RESUME', params)
      return false
    }
    return decision === 'allow'
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>{HEADINGS[state] ?? 'Checkout'}</Text>
        <Button title="Cancel" disabled={!ready} onPress={() => send('PAYMENT_CANCEL')} />
      </View>

      <WebView
        ref={webview}
        source={{ uri: CHECKOUT_URL }}
        onLoadStart={() => {
          session.current = null
          setReady(false)
        }}
        onMessage={(event) => {
          if (merchantPolicy.decide(event.nativeEvent.url) === 'allow')
            handleMessage.current?.(event.nativeEvent.data)
        }}
        onShouldStartLoadWithRequest={decide}
        // The checkout has fields; the keyboard must not cover them.
        keyboardDisplayRequiresUserAction={false}
        automaticallyAdjustContentInsets={false}
        style={styles.webview}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06040a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { color: '#ebe9ef', fontSize: 17, fontWeight: '600' },
  webview: { flex: 1, backgroundColor: 'transparent' },
})
