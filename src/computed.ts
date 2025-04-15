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
// Import only AtomProto from atom.ts
import { AtomProto } from './atom'; // Removed triggerEvent triggerLifecycleEvent

// Computed related types
type Stores = ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
type StoreValues<S extends Stores> = {
  [K in keyof S]: S[K] extends Atom<infer V> | ReadonlyAtom<infer V> ? V : never
};

// Minimal Computed Atom Prototype
export const ComputedAtomProto: ReadonlyAtom<any> = {
  // Inherit simplified properties and methods from AtomProto
  ...AtomProto, // Includes _value _listeners get set (noop) _notify _notifyBatch value getter

  // Computed-specific properties
  _sources: undefined, // Array of source atoms
  _sourceValues: undefined, // Array to store last known values of sources
  _calculation: undefined, // The function to compute the value
  _equalityFn: undefined, // Function to compare new/old values
  _unsubscribers: undefined, // Array of unsubscribe functions for sources
  _onChangeHandler: undefined, // Cached handler for source changes
  _dirty: true, // Flag indicating if recalculation is needed
  // REMOVED: Event/state properties (_onMount _onStart _onStop _onSet _onNotify _mountCleanups _active)

  // Simplified get
  get(): any {
    // Subscribe to sources only if we have listeners but haven't subscribed yet
    if (!this._unsubscribers && this._listeners && this._listeners.size > 0) {
        this._subscribeToSources!(); // Use non-null assertion
    }
    // Calculate value if dirty
    if (this._dirty) {
       this._update!(); // Use non-null assertion
    }
    return this._value;
  },

  // Simplified _update - no event triggering
  _update() {
    const sources = this._sources!; // Use non-null assertion
    const sourceValues = this._sourceValues!; // Use non-null assertion
    const calculation = this._calculation!;
    const sourceCount = sources.length;

    let newValue;
    for (let i = 0; i < sourceCount; i++) {
      sourceValues[i] = sources[i]!.get();
    }
    newValue = calculation.apply(null, sourceValues as any);

    const oldValue = this._value;
    this._dirty = false; // Mark as clean

    if (!this._equalityFn!(newValue, oldValue)) {
      // REMOVED: onSet triggering and payload logic

      this._value = newValue;

      if (batchDepth > 0) {
        // Simplified batching - uses AtomProto's _batchValue logic
        if (!batchQueue.has(this)) {
           (this as any)._batchValue = this._value;
           batchQueue.add(this);
        }
      } else {
        // Notify immediately using simplified _notify
        this._notify(newValue, oldValue);
      }
    }
  },

  // Simplified _onChange
  _onChange() {
    if (!this._dirty) {
      this._dirty = true;
      // If there are listeners schedule an update (batched or immediate)
      if (this._listeners && this._listeners.size > 0) {
        if (batchDepth > 0) {
          // Add to batch queue _notifyBatch will handle update if needed
          if (!batchQueue.has(this)) {
             (this as any)._batchValue = this._value; // Store pre-change value? Or let _update handle final? Let _update handle.
             batchQueue.add(this);
          }
        } else {
          // Update immediately if not batching
          this._update!();
        }
      }
    }
  },

  // Simplified _subscribeToSources
  _subscribeToSources() {
      if (this._unsubscribers) return; // Already subscribed
      const sources = this._sources!;
      const sourceCount = sources.length;
      this._unsubscribers = new Array(sourceCount);

      // Create handler if it doesn't exist
      if (!this._onChangeHandler) {
          const self = this;
          this._onChangeHandler = () => { self._onChange!(); };
      }

      // Subscribe to each source
      for (let i = 0; i < sourceCount; i++) {
          this._unsubscribers[i] = sources[i]!.subscribe(this._onChangeHandler!);
      }
  },

  // Simplified _unsubscribeFromSources
  _unsubscribeFromSources() {
      if (!this._unsubscribers) return; // Nothing to unsubscribe from
      for (const unsubscribe of this._unsubscribers) {
          unsubscribe(); // Call each unsubscribe function
      }
      this._unsubscribers = undefined; // Reset the array
      // We might become dirty again now that we aren't listening
      this._dirty = true;
  },

  // Simplified subscribe - no events manages source subscription
  subscribe(listener: Listener<any>): Unsubscribe {
    const isFirstListener = !this._listeners || this._listeners.size === 0;

    // Ensure listener set exists
    if (!this._listeners) {
      this._listeners = new Set();
    }
    this._listeners.add(listener);

    // Subscribe to sources ONLY when the first listener is added
    if (isFirstListener) {
      this._subscribeToSources!();
    }

    // Ensure the value is calculated. The potential notification from get()
    // serves as the initial notification if the value changed from undefined.
    this.get(); // Ensures calculation if dirty
    // REMOVED: Explicit listener call: listener(this._value undefined);

    const self = this; // Capture 'this' for the unsubscribe closure
    return function unsubscribe(): void {
      const currentListeners = self._listeners;
      if (currentListeners) {
        currentListeners.delete(listener);
        // Unsubscribe from sources ONLY when the last listener is removed
        if (currentListeners.size === 0) {
          self._unsubscribeFromSources!();
        }
      }
    };
  },

  // _notify and _notifyBatch are inherited directly from simplified AtomProto

  // REMOVED: value getter
  // get value(): any {
  //   return this.get();
  // }
  // REMOVED: listeners getter
};

// Factory function
export function computed<T, S extends Stores>(
  stores: S,
  calculation: (...values: StoreValues<S>) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is
): ReadonlyAtom<T> {
  const computedAtom = Object.create(ComputedAtomProto) as ReadonlyAtom<T>;
  computedAtom._sources = stores;
  computedAtom._sourceValues = Array(stores.length);
  computedAtom._calculation = calculation;
  computedAtom._equalityFn = equalityFn;
  computedAtom._dirty = true;
  return computedAtom;
}
