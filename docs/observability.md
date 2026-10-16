# Observe checkout without payment data

> [Русская версия](./ru/observability.md)

`observeCheckout` lets you collect metrics about the checkout — for example, how often shoppers reach the 3DS step or how many payments are declined — without leaking payment data.

For every engine event it gives you one small event with only fixed values (categories). It does not send anything over the network, does not store events and does not depend on any analytics service. You decide where to send them.

```ts
import { observeCheckout } from '@checkout-kit/core'

const unsubscribe = observeCheckout(engine, (event) => {
  metrics.record('checkout', event)
})
// On screen teardown:
unsubscribe()
```

- `metrics` is your own service.
- Subscribe once per engine. In React, subscribe inside an effect and return `unsubscribe` as its cleanup.
- If your callback throws, the error is handled like any other engine listener error. Make sure your logger does not write sensitive data from the error to logs.

| Event                                         | Fields it may contain   |
| --------------------------------------------- | ----------------------- |
| `phase_changed`                               | `phase`, `previous`     |
| `provider_changed`, `intent_created`, `error` | None                    |
| `action_required`                             | `actionKind`            |
| `action_started`                              | `actionKind`, `surface` |
| `action_finished`                             | `actionKind`, `via`     |
| `result`                                      | `status`                |

## What is never included {#what-is-never-included}

Only known fixed values are sent. The event never contains:

- order, payment, step or provider ids;
- amounts;
- buyer information;
- card fields or tokens;
- addresses (URLs);
- error messages or error codes;
- SDK data or step results.

This works by an allowlist: the helper copies only the allowed fields. It does not try to "clean" an arbitrary object, which could miss something.

If you already subscribe to a specific event with `engine.on`, `toCheckoutTelemetryEvent(event)` gives you the same safe version of it.

## How to read these metrics {#how-to-read-these-metrics}

Use the events to see where shoppers are in the checkout, how often bank checks get in the way, and what results shoppers see.

- `result: processing` may be followed by a final result later. It is **not** a completed payment.
- An engine result is **not** a settlement, a delivered order or revenue. Take those numbers from the confirmed state on your server.
- If you add your own labels, user ids or error reports in your callback, protecting that data is your responsibility again.

[Payment security](./production.md) · [React lifecycle](./react.md)
