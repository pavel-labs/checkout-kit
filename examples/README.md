# Examples

| Folder                                               | Purpose                                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| [`react/`](./react/)                                 | A plain React checkout, with optional Stripe Elements and Adyen Web fields |
| [`providers/`](./providers/)                         | Registration and headless usage of the installable provider packages       |
| [`server/`](./server/README.md)                      | Merchant routes, official sandbox SDKs and an explicit local simulator     |
| [`react-native-checkout/`](./react-native-checkout/) | A native host for the checkout WebView bridge                              |

## Run the complete integration without credentials

From the repository root:

```bash
npm ci
npm run dev:integration
```

Open <http://localhost:5173>. Choose Stripe, Adyen or PayPal. The browser calls the local
merchant server using the same route and DTO contracts as the sandbox adapters.

Stripe/Adyen simulation tokens:

| Token                | Result                                  |
| -------------------- | --------------------------------------- |
| `pm_mock_approve`    | Successful payment                      |
| `pm_mock_decline`    | Decline, followed by a fresh retry      |
| `pm_mock_challenge`  | Full-page approval, return and recovery |
| `pm_mock_processing` | Processing, then authoritative polling  |

PayPal always opens the local approval page; approving it triggers capture after returning.
The simulator never contacts a provider. [The server guide](./server/README.md) explains
how to run official sandbox APIs with your own test credentials and SDK fields.

The six generic reference protocols are also available on the React screen through MSW.
For their full app and bank simulator, use `npm run dev:mock`.

## Validation

```bash
npm run examples:typecheck
npm run build:react -w @checkout-kit/examples
npm run test:integration
```

CI runs example HTTP tests and browser flows for all three provider packages. These checks
need no credentials and do not certify a live sandbox account.
