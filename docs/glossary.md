# Glossary

> [Русская версия](./ru/glossary.md)

Payment code has its own words. This page explains each one in plain language. The other guides use these words without explaining them again, so come back here when a word is unclear.

## People and systems

**Shopper (buyer).** The person who pays.

**Merchant.** You: the business that sells something and receives the money.

**Merchant server (merchant API).** Your backend. It knows the real prices, keeps secret keys, talks to the payment provider and decides whether an order is paid. The browser never decides this on its own.

**Payment provider (PSP).** The company that moves the money: Stripe, Adyen, PayPal, a bank and so on. PSP means "payment service provider".

**Acquiring bank (acquirer).** A bank that accepts card payments for a merchant. Some banks offer this directly, without a company like Stripe in between.

**Host (host application).** The application where the checkout runs: your website, your React app, or a native mobile app that shows the checkout in a WebView.

## Parts of checkout kit

**Engine.** The main object from `@checkout-kit/core`. You create it with `createCheckout()`. It runs the payment step by step: create the payment, send the payment details, handle extra steps, get the result.

**Headless.** The engine has no visual part. It does not draw buttons or forms. You draw the interface yourself, or use the optional `@checkout-kit/ui` package.

**Provider plugin (adapter).** A package that teaches the engine to talk to one payment provider. For example, `@checkout-kit/provider-stripe` knows Stripe's request and response formats. The engine itself knows nothing about any specific provider.

**Runtime and runners.** A runner is the code that performs one kind of extra step in the browser: opens a bank page, shows a QR code, starts a provider's SDK. `@checkout-kit/runtime-browser` contains ready-made runners for the browser.

**Mount.** A place on the page (a DOM element) where a runner can show something, such as a bank page in an iframe. In React, `PaymentActionHost` creates it for you.

**Snapshot.** The current state of the engine at one moment: which step it is on, the payment, any error. React hooks read the snapshot and re-render when it changes.

**Phase.** The current step of the engine, for example "creating", "waiting for action" or "succeeded".

## The payment itself

**Intent (payment intent).** One payment record at the provider. It has an id, an amount, a currency and a status. The name comes from Stripe, but the engine uses it for every provider.

**Instrument (payment instrument).** What the shopper pays with: a card token, a wallet token, or nothing at all (`{ kind: 'none' }`) when the provider collects the details on its own page.

**Token.** A safe replacement for card data. The provider's own form collects the card number and gives you back a short string, for example `pm_123`. You send this string instead of the card number, so real card data never touches your code.

**Attempt.** One try to pay. If the network fails in the middle, the same attempt is repeated. A new attempt is started only when the previous one has clearly finished.

**Idempotency key.** A unique string you attach to an attempt. If the same request is sent twice (for example, after a lost reply), the server sees the same key and returns the first result instead of charging the shopper again.

**Action.** An extra step the provider asks for before it can finish the payment. Examples: confirm the payment on the bank's page, enter a one-time code, scan a QR code. The engine stops and waits until the host runs the action.

**Evidence.** What comes back after an action: URL parameters after a redirect, a message from an iframe, an SDK callback. Evidence only shows that the shopper went through the step. It is **not** proof of payment. The engine always asks the provider for the real status afterwards.

**Capture.** Actually taking the money. Some payments first only reserve (authorize) the money and take it later. Most examples here capture automatically.

**Processing.** The provider has accepted the payment but does not know the final result yet. The engine checks the status again later instead of starting a new payment.

**Final (terminal) status.** A result that will not change: succeeded, declined, canceled or failed.

## Extra steps in the browser

**Redirect.** The browser leaves your page and opens another site (for example, the bank's page). After that it comes back to your **return URL**.

**Return URL (return route).** The page on your site where the shopper comes back after a redirect. Your app must open on this address and call `engine.hydrate()`.

**Hydrate (recovery).** Restoring a payment after the page was reloaded or after a redirect. Before leaving the page, the engine saves a few ids in session storage. `hydrate()` reads them and asks the provider for the real result.

**Session storage.** Browser storage that lives while the tab is open. The engine keeps only ids there, never card data or secrets.

**Iframe.** A page shown inside your page, in a frame. Banks often show their confirmation page this way.

**3-D Secure (3DS).** A card check by the shopper's bank: a one-time code, a push in the banking app and so on. It is also called a **challenge**. 3DS1 is the old version, 3DS2 is the current one.

**SDK.** A JavaScript library from the provider, for example Stripe.js. It shows the provider's own card fields or wallet buttons.

**Hosted fields.** Card fields that the provider shows inside an iframe on your page. Your code never sees the card number.

**Hosted payment page (HPP).** A whole payment page on the provider's site. The shopper is redirected there and comes back afterwards.

**Wallet.** Apple Pay, Google Pay or a similar service that pays with a stored card.

**Polling.** Asking the server for the status again and again every few seconds until the result is known. It is used, for example, for QR code payments.

**Origin.** The scheme, domain and port of a site, for example `https://shop.example:443`. The browser uses it to decide which site may talk to which. The engine accepts messages only from expected origins.

## Server side

**Webhook (notification).** A request that the provider sends to your server on its own when a payment status changes. It works even if the shopper closed the browser. Your server must check that the webhook is real (for example, by an HMAC signature).

**Fulfillment.** Giving the shopper what they paid for: shipping the order, opening access and so on. Do this only on the server, only after a confirmed payment.

**Reconciliation.** Comparing your records with the provider's records and fixing differences. For example, finding a payment that succeeded while the shopper's browser was closed.

## Testing

**Sandbox.** A test account at a real provider. Real API, fake money.

**Simulator (mock).** A local fake provider that runs on your computer. No account or keys are needed. It is good for development but does not replace a sandbox check.

**Fixture.** A prepared test data file, for example a saved provider response.

**Conformance tests.** A ready set of tests from `@checkout-kit/conformance`. Every provider plugin must pass them. They check that the plugin follows the engine's rules.

## Native apps

**WebView.** A browser component inside a native iOS or Android app. The app can show the checkout web page inside it.

**Bridge.** The message channel between the web page in the WebView and the native app. `@checkout-kit/webview-bridge` provides it.

**Deep link.** A link that opens a specific screen in an app, for example `mybank://pay?id=1`.
