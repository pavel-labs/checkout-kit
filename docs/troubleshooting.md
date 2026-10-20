# Troubleshooting

> [Русская версия](./ru/troubleshooting.md)

First, collect the basic facts: the engine phase, the provider, the payment (intent) id, the kind of step (action) and the error code. Then look at the matching request to your server.

Never write card fields, tokens, client secrets or raw SDK responses to logs.

## Setup

| Problem                                       | What to check and how to fix                                                                                                                                                                                                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm cannot download a checkout-kit dependency | Use the full `@checkout-kit/*` name and public registry. Remove an old `@checkout-kit:registry` setting pointing to GitHub Packages from your project/user npm config. Check `npm view @checkout-kit/core version --registry=https://registry.npmjs.org`. See [installation](./getting-started.md#install-from-npm). |
| The UI has no styles                          | Import `@checkout-kit/ui/styles.css` and wrap the checkout in `CheckoutRoot` (or an element with the `.ck-root` class).                                                                                                                                                                                              |
| `window is not defined` during SSR            | Create the runtime and the bridge only in the browser. React and UI components can be imported and rendered on the server.                                                                                                                                                                                           |
| Unknown provider                              | Import its config type and register it with its real id and module.                                                                                                                                                                                                                                                  |
| No cookie / the API call fails                | Check `baseUrl`, origin, `credentials`, the host name and that the buyer has a session.                                                                                                                                                                                                                              |

## Extra steps (actions)

| Problem                                 | What to check and how to fix                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A step is waiting, but nothing is shown | Render `PaymentActionHost`, or call `runPendingAction` yourself.                                                   |
| No place to show the step (no mount)    | For iframe and inline steps, use `createMount(element)` and keep that element visible.                             |
| No SDK adapter                          | The adapter's `sdk` name must match `action.sdk`. See the [provider setup](./packages.md#named-provider-adapters). |
| The SDK returns too early               | Return the result from the SDK's "finished" or "additional details" callback, not when the component appears.      |
| Integrity conflict                      | Use one script address and one hash per session. Reload the page before changing them.                             |
| The iframe's answer is ignored          | Check the exact origin, the sender, the message type and the step id. Do not allow "any origin" (`*`).             |
| Unsupported step                        | Turn on only payment methods you support, or implement the step type the provider returned.                        |
| A QR payment never finishes             | Check the status on your server, the notifications and the status polling. Scanning a code does not prove payment. |

## Recovery and status

| Problem                                | What to check and how to fix                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| The return page shows 404              | Your app must open at exactly the return address on the deployed site.                                |
| The saved payment is not found         | Pass `runtime.storage` to the engine. Stay in the same tab. Do not call `reset()` before `hydrate()`. |
| The server is down during recovery     | Keep the parameters and call `hydrate` again when the server is back.                                 |
| Processing never ends                  | Check the same payment before allowing a new charge.                                                  |
| Stripe `capture_required`              | Capture the money on your server. The example uses automatic capture.                                 |
| PayPal `capture_unverified`            | Return the checked capture status, amount and currency — not only the order status.                   |
| Adyen `Pending` / `Received`           | Check the webhook signature (HMAC), the account, the event order and what is stored on the server.    |
| Data from another order / invalid data | Use the saved step of this order.                                                                     |
| HTTP 409 on a repeated request         | The data changed, but the operation key stayed the same. Look at the first result for that key.       |
| The retry button stays disabled        | `isLocked` is also true in final states. Add your own condition for recovery.                         |

## Mobile apps (native bridge) {#native-bridge}

- Use the session from the `PAYMENT_READY` message, and give every command a unique id.
- Build injected commands with `createBridgeCommand` / `createCommandScript`. They escape the data safely.
- Old and duplicate commands are ignored. A `ping` gets an answer with the matching ready data.
- In `onMessage`, accept messages only from your checkout page address.
- Even if the WebView is allowed to open the bank's page, that page cannot give orders to your app.
- When the app receives a return link with its own scheme, send its data as `PAYMENT_RESUME` instead of loading that address in the WebView.

[The mobile app example](../examples/react-native-checkout/README.md) stores return links that arrive before the handshake, and shows how to handle navigation. Browser tests do not replace a real iOS or Android build.

## Find where it fails {#isolate-the-failure}

Run `npm run dev:integration` to compare your setup with the local simulator.

- If the simulator works, the problem is in your sandbox settings, your server or the SDK setup.
- If the simulator also fails, run the tests of the affected package and the [contract tests](./testing.md).
