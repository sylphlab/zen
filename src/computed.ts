// 极致优化的轻量级状态管理库 (怪兽性能版) - 计算属性实现

import {
  Atom,
  ReadonlyAtom,
  // Atom, // Removed duplicate
  // ReadonlyAtom, // Removed duplicate
  Listener,
  Unsubscribe,
  // EMPTY_SET, // Removed
  batchDepth,
  batchQueue,
  // EventPayload, // Removed
  // SetPayload, // Removed
  // NotifyPayload, // Removed
  // EventCallback, // Removed
  // SetEventCallback, // Removed
  // NotifyEventCallback // Removed
} from './core';
// REMOVED: import { AtomProto } from './atom';
import { atom } from './atom'; // Import atom factory

// Computed related types
type Stores = ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
type StoreValues<S extends Stores> = {
  [K in keyof S]: S[K] extends Atom<infer V> | ReadonlyAtom<infer V> ? V : never
};

// REMOVED: ComputedAtomProto definition

// Factory function for computed (ReadonlyAtom)
export function computed<T, S extends Stores>(
  stores: S,
  calculation: (...values: StoreValues<S>) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is
): ReadonlyAtom<T> {
  let _value: T | undefined = undefined;
  let _listeners: Set<Listener<T>> | undefined = undefined;
  const _sources: ReadonlyArray<Atom<any> | ReadonlyAtom<any>> = stores;
  // Correctly declare variables within the closure
  let _sourceValues: any[] | undefined = undefined; // Initialize as undefined
  let _unsubscribers: Unsubscribe[] | undefined = undefined;
  let _onChangeHandler: (() => void) | undefined = undefined;
  let _dirty: boolean = true;
  const _calculationFn = calculation; // Assign calculation to a closure variable
  const _equalityFn = equalityFn; // Assign equalityFn to a closure variable


  // Define _notify function within closure
  const _notify = (value: T, oldValue?: T): void => {
    if (_listeners && _listeners.size > 0) {
      for (const listener of _listeners) {
        listener(value, oldValue);
      }
    }
  };

  // Define _notifyBatch function within closure
  const _notifyBatch = (): void => {
    // Need to recompute if dirty before notifying
    if (_dirty) {
      _update(); // Ensure value is current
    }
    _notify(_value!, undefined); // Use computed _value
  };

  // Define _update function within closure
  const _update = (): void => {
    const sourceCount = _sources.length;
    let changed = false;
    let newSourceValues: any[] = Array(sourceCount);

    // Get current source values and check if they changed
    for (let i = 0; i < sourceCount; i++) {
      const source = _sources[i]!;
      newSourceValues[i] = source.get();
      if (_sourceValues === undefined || !Object.is(newSourceValues[i], _sourceValues[i])) {
        changed = true;
      }
    }

    // Only recalculate if a source changed or it's the first run
    if (changed || _dirty) { // Also recalculate if marked dirty explicitly
      const oldValue = _value;
      _sourceValues = newSourceValues; // Store new source values
      _value = calculation.apply(null, _sourceValues as any);
      _dirty = false; // Mark as clean

      // Notify if the computed value changed
      if (oldValue === undefined || !equalityFn(_value!, oldValue)) {
        // Need to handle batching correctly for computed as well
        const self = computedAtom; // Capture instance for batching
        if (batchDepth > 0) {
           if (!batchQueue.has(self)) {
               batchQueue.add(self);
           }
        } else {
           _notify(_value!, oldValue);
        }
      }
    }
  };

  // Define _onChange function (called by source subscriptions)
  const _onChange = (): void => {
    if (!_dirty) {
      _dirty = true;
      // If there are listeners, schedule an update
      if (_listeners && _listeners.size > 0) {
         const self = computedAtom; // Capture instance for batching
         if (batchDepth > 0) {
            if (!batchQueue.has(self)) {
               batchQueue.add(self);
            }
         } else {
            _update(); // Update immediately if not batching (this triggers notify if needed)
         }
      }
    }
  };

  // Define _subscribeToSources within closure
  const _subscribeToSources = (): void => {
    if (_unsubscribers) return;
    const sourceCount = _sources.length;
    _unsubscribers = Array(sourceCount);
    _onChangeHandler = _onChangeHandler || _onChange; // Use cached handler or create it

    for (let i = 0; i < sourceCount; i++) {
      _unsubscribers[i] = _sources[i]!.subscribe(_onChangeHandler);
    }
  };

  // Define _unsubscribeFromSources within closure
  const _unsubscribeFromSources = (): void => {
    if (!_unsubscribers) return;
    for (const unsubscribe of _unsubscribers) {
      unsubscribe();
    }
    _unsubscribers = undefined;
    _dirty = true; // Mark as dirty since we stopped listening
  };


  // Create the computed atom object directly
  const computedAtom: ReadonlyAtom<T> = {
     // Define methods within closure
     get(): T {
       // Subscribe only if needed
       if (!_unsubscribers && _listeners && _listeners.size > 0) {
         _subscribeToSources();
       }
       if (_dirty) {
         _update(); // Recalculate if dirty
       }
       return _value!; // Assuming it's calculated by now
     },
     subscribe(listener: Listener<T>): Unsubscribe {
       const isFirst = !_listeners || _listeners.size === 0;
       (_listeners = _listeners || new Set()).add(listener);
       if (isFirst) {
         _subscribeToSources();
       }
       this.get(); // Ensure calculation and potential initial notify
       // REMOVED explicit listener call
       return (): void => {
         if (_listeners) {
           _listeners.delete(listener);
           if (_listeners.size === 0) {
             _unsubscribeFromSources();
           }
         }
       };
     },
     // Assign internal methods needed by interface/batching
     _notify,
     _notifyBatch,
     // Ensure _value getter always returns T by calling get() if needed
     get _value(): T { return _value !== undefined ? _value : this.get() },
     get _listeners() { return _listeners }, // Expose internal listeners

     // Assign computed-specific internal methods/properties required by interface
     _dirty,
     _sources,
     _sourceValues,
     _calculation: calculation, // Store the function
     _equalityFn: equalityFn,   // Store the function
     _unsubscribers,
     _onChangeHandler,
     _onChange,
     _update,
     _subscribeToSources,
     _unsubscribeFromSources,
     // _batchValue is on the interface for batching, not explicitly managed here
  };

  return computedAtom;
}
