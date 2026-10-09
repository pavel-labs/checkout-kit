// React binding over the engine. It works because the engine returns the same snapshot
// object until something changes - see the store.

import { useMemo, useSyncExternalStore } from 'react'
import {
  isBusyPhase,
  isSettledPhase,
  type CheckoutEngine,
  type CheckoutSnapshot,
} from '@checkout-kit/core'

import { useCheckoutEngine } from './context'

export { useCheckoutEngine }

export const useCheckoutSnapshot = (): CheckoutSnapshot => {
  const engine = useCheckoutEngine()
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
}

// A selector reader belongs to the external store subscription, not to render state.
const createSelectorReader = <T>(
  engine: CheckoutEngine,
  selector: (snapshot: CheckoutSnapshot) => T,
  isEqual: (previous: T, next: T) => boolean,
): (() => T) => {
  let previous: { snapshot: CheckoutSnapshot; value: T } | undefined
  return () => {
    const snapshot = engine.getSnapshot()
    if (previous?.snapshot === snapshot) return previous.value
    const value = selector(snapshot)
    const selected = previous && isEqual(previous.value, value) ? previous.value : value
    previous = { snapshot, value: selected }
    return selected
  }
}

/** Subscribe to one derived value. Object selections can provide an equality function. */
export const useCheckoutSelector = <T>(
  selector: (snapshot: CheckoutSnapshot) => T,
  isEqual: (previous: T, next: T) => boolean = Object.is,
): T => {
  const engine = useCheckoutEngine()
  // Repeated React reads of one immutable snapshot must return the same selection.
  const select = useMemo(
    () => createSelectorReader(engine, selector, isEqual),
    [engine, selector, isEqual],
  )
  return useSyncExternalStore(engine.subscribe, select, select)
}

export interface UseCheckoutResult extends CheckoutSnapshot {
  engine: CheckoutEngine
  /** A request is in flight. `action_pending` is not busy: the shopper is acting. */
  isBusy: boolean
  /** Nothing further will happen without the shopper starting over. */
  isSettled: boolean
  /** Nothing about the payment may be changed any more. What a form disables on. */
  isLocked: boolean
}

export const useCheckout = (): UseCheckoutResult => {
  const engine = useCheckoutEngine()
  const snapshot = useCheckoutSnapshot()

  return {
    ...snapshot,
    engine,
    isBusy: isBusyPhase(snapshot.phase),
    isSettled: isSettledPhase(snapshot.phase),
    isLocked:
      isBusyPhase(snapshot.phase) ||
      isSettledPhase(snapshot.phase) ||
      snapshot.phase === 'action_pending',
  }
}
