# Observe checkout without payment data

> [Русская версия](./ru/observability.md)

`observeCheckout` reports one small categorical event for each engine event. It does not
start a network request, retain events or depend on an analytics vendor. Your application
chooses whether and where to report them.

```ts
import { observeCheckout } from '@checkout-kit/core'

const unsubscribe = observeCheckout(engine, (event) => {
  metrics.record('checkout', event)
})
// On screen teardown:
unsubscribe()
```

`metrics` is your application service. Register once per engine; in React, register in an
effect and return `unsubscribe` as its cleanup. Observer failures are handled like other
engine listener failures; keep the host logger from serializing sensitive exceptions.

| Event                                         | Optional categorical fields |
| --------------------------------------------- | --------------------------- |
| `phase_changed`                               | `phase`, `previous`         |
| `provider_changed`, `intent_created`, `error` | None                        |
| `action_required`                             | `actionKind`                |
| `action_started`                              | `actionKind`, `surface`     |
| `action_finished`                             | `actionKind`, `via`         |
| `result`                                      | `status`                    |

Only known enum values are emitted. The helper excludes order/payment/action/provider IDs,
amounts, buyer information, card fields, tokens, URLs, error messages/codes and SDK/evidence
payloads. It uses a whitelist rather than attempting to redact an arbitrary third-party object.
`toCheckoutTelemetryEvent(event)` provides the same projection when you already subscribe
to a specific event with `engine.on`.

Use these events to investigate checkout phases, authentication friction and visible result
mix. `result: processing` can be followed by a terminal result; it is not a completed payment.
An engine result is not a settlement, fulfillment or revenue event. Read those metrics from
verified merchant-server state. Adding custom labels, identity or exception reporting to
your analytics callback reintroduces your own data-handling responsibilities.

[Payment security and production boundary](./production.md) · [React lifecycle](./react.md)
