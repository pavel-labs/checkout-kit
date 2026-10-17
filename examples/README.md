# Examples

| Folder                                               | What is inside                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`react/`](./react/)                                 | A simple React checkout page, with optional Stripe Elements and Adyen Web fields. |
| [`providers/`](./providers/)                         | How to register the provider packages and use them without React.                 |
| [`server/`](./server/README.md)                      | Server routes, official sandbox SDKs and a separate local simulator.              |
| [`react-native-checkout/`](./react-native-checkout/) | A mobile app that shows the checkout in a WebView.                                |

## Run the full example without any keys

From the repository root:

```bash
npm ci
npm run dev:integration
```

Open <http://localhost:5173> and choose Stripe, Adyen or PayPal. The browser talks to the local server with the same routes and data formats as the real sandbox adapters.

Test values for Stripe and Adyen:

| Value                | What happens                                                         |
| -------------------- | -------------------------------------------------------------------- |
| `pm_mock_approve`    | The payment succeeds.                                                |
| `pm_mock_decline`    | The payment is declined; you can then try again.                     |
| `pm_mock_challenge`  | A full-page approval, then the return and recovery of the payment.   |
| `pm_mock_processing` | "Processing" first, then the engine checks the status on the server. |

PayPal always opens a local approval page. After you approve and come back, the server captures the money.

The simulator never contacts a real provider. [The server guide](./server/README.md) explains how to use the official sandbox APIs with your own test keys and SDK fields.

The six example protocols are also available on the React page, served by a fake MSW server. For their full app and the bank simulator, run `npm run dev:mock`.

## Checks

```bash
npm run examples:typecheck
npm run build:react -w @checkout-kit/examples
npm run test:integration
```

CI runs the HTTP tests and browser scenarios of the examples for all three provider packages. These checks need no keys. They do not prove that a real sandbox account is set up correctly.
