---
'@checkout-kit/core': patch
---

Retain the same creation key after a lost create/prepare reply even when no intent id reached the engine. Retry the original merchant operation without creating another order; changed inputs, an explicit new key and reset still start a new attempt.
