// 极致优化的轻量级状态管理库 (怪兽性能版) - 计算属性实现

import {
  Atom,
  ReadonlyAtom,
  Listener,
  Unsubscribe,
  batchDepth,
  batchQueue,
} from './core';
import { LIFECYCLE, emit } from './events'; // Import lifecycle events
// Import only AtomProto from atom.ts
import { AtomProto } from './atom';

// Computed related types
type Stores = ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
type StoreValues<S extends Stores> = {
  [K in keyof S]: S[K] extends Atom<infer V> | ReadonlyAtom<infer V> ? V : never
};

// Minimal Computed Atom Prototype
export const ComputedAtomProto: ReadonlyAtom<any> = {
  // Inherit simplified properties and methods from AtomProto
  ...AtomProto, // Includes _value _listeners get set (noop) etc.

  // Computed-specific properties
  _sources: undefined,
  _sourceValues: undefined,
  _calculation: undefined,
  _equalityFn: undefined,
  _unsubscribers: undefined,
  _onChangeHandler: undefined,
  _dirty: true,
  // _isSubscribing: false, // Removed flag to suppress initial onNotify
  // --- Overrides ---

  // Override _notify specific to Computed: ONLY notify listeners.
  // onNotify emission is handled separately in _update and _notifyBatch.
  _notify: function(value: any, oldValue?: any) {
    if (this._listeners && this._listeners.size > 0) {
      // Use Array.from for safe iteration if listeners might unsubscribe themselves
      Array.from(this._listeners).forEach(listener => listener(value, oldValue));
    };
    // DO NOT emit onNotify here.
  },

  // Override _notifyBatch specific to Computed: Call base listener notify, then emit onNotify.
  _notifyBatch() {
    const oldValue = this._oldValueBeforeBatch;
    const newValue = this._value;
    delete this._oldValueBeforeBatch; // Clear stored old value

    // Only notify listeners and emit onNotify if the value actually changed
    if (!Object.is(newValue, oldValue)) {
        // Call the base _notify implementation from AtomProto just to iterate listeners
        (AtomProto._notify as Function).call(this, newValue, oldValue);
        // Emit onNotify *after* batch listeners are notified
        // Emit onNotify *after* batch listeners are notified
        emit(this, LIFECYCLE.onNotify, newValue);
    }
  },

  // --- Core Computed Logic ---

  get(): any {
    if (!this._unsubscribers && this._listeners && this._listeners.size > 0) {
        this._subscribeToSources!();
    }
    if (this._dirty) {
       this._update!();
    }
    return this._value;
  },

  _update(): boolean {
    // Cache frequently accessed properties to avoid repeated property lookups
    const sources = this._sources!;
    const sourceValues = this._sourceValues!;
    const calculation = this._calculation!;
    const sourceCount = sources.length;

    // Fast path: Read all source values
    for (let i = 0; i < sourceCount; i++) {
      sourceValues[i] = sources[i]!.get();
    }
    
    // Calculate new value
    const newValue = calculation.apply(null, sourceValues as any);
    const oldValue = this._value;
    
    // Mark as up-to-date immediately to avoid redundant updates
    this._dirty = false;

    // Fast equality check
    if (this._equalityFn!(newValue, oldValue)) {
      return false; // No change
    }
    
    // Update value
    this._value = newValue;

    // Handle notifications
    if (batchDepth > 0) {
      if (!batchQueue.has(this)) {
        this._oldValueBeforeBatch = oldValue;
        batchQueue.add(this);
      }
    } else {
      // Single notification for both listeners and lifecycle event
      this._notify(newValue, oldValue);
      // Only emit onNotify once per update
      emit(this, LIFECYCLE.onNotify, newValue);
    }
    
    return true; // Value changed
  },

  _onChange() {
    // Skip if already dirty to avoid redundant work
    if (this._dirty) return;
    
    // Mark as dirty
    this._dirty = true;
    
    // Only update if there are listeners
    if (!this._listeners || this._listeners.size === 0) return;
    
    // Handle batched or immediate updates
    if (batchDepth > 0) {
      // Add to batch queue if not already queued
      if (!batchQueue.has(this)) {
        this._oldValueBeforeBatch = this._value;
        batchQueue.add(this);
      }
    } else {
      // Immediate update
      this._update!();
    }
  },

  _subscribeToSources() {
      if (this._unsubscribers) return;
      const sources = this._sources!;
      const sourceCount = sources.length;
      this._unsubscribers = new Array(sourceCount);

      if (!this._onChangeHandler) {
          const self = this;
          this._onChangeHandler = () => { self._onChange!(); };
      }

      for (let i = 0; i < sourceCount; i++) {
          this._unsubscribers[i] = sources[i]!.subscribe(this._onChangeHandler!);
      }
  },

  _unsubscribeFromSources() {
      if (!this._unsubscribers) return;
      for (const unsubscribe of this._unsubscribers) {
          unsubscribe();
      }
      this._unsubscribers = undefined;
      this._dirty = true;
  },

  subscribe(listener: Listener<any>): Unsubscribe {
    const isFirstListener = !this._listeners || this._listeners.size === 0;
    (this._listeners = this._listeners || new Set()).add(listener);

    if (isFirstListener) {
      this._subscribeToSources!();
      emit(this, LIFECYCLE.onStart);
    }
    emit(this, LIFECYCLE.onMount, listener);

    // Removed _isSubscribing flag usage
    this.get(); // Ensures calculation if dirty and notifies if value changed initially
    const self = this;
    return function unsubscribe(): void {
      const currentListeners = self._listeners;
      if (currentListeners) {
        currentListeners.delete(listener);
        if (currentListeners.size === 0) {
          self._unsubscribeFromSources!();
          emit(self, LIFECYCLE.onStop);
        }
      }
    };
  },

  // set method is intentionally missing/noop for ReadonlyAtom
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
  // Initialize value to trigger initial calculation/notification if needed by subscribers
  // computedAtom.get(); // Maybe not needed if subscribe calls get()
  return computedAtom;
}
