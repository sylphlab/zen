// Core type definitions and base prototype for the zen state management library.
import type { LifecycleListener } from './events';

/** Callback function type for atom listeners. */
export type Listener<T> = (value: T, oldValue?: T) => void;
/** Function to unsubscribe a listener. */
export type Unsubscribe = () => void;

// --- Core Types ---

/**
 * Represents a writable atom, the basic unit of state.
 */
export type Atom<T = any> = {
  get(): T;
  set(v: T, force?: boolean): void;
  subscribe(fn: Listener<T>): Unsubscribe;
  _value: T;
  _listeners?: Set<Listener<T>>;
  // --- Optional properties added by patching ---
  _startListeners?: Set<LifecycleListener<T>>; // Added by events.ts
  _stopListeners?: Set<LifecycleListener<T>>;  // Added by events.ts
  _setListeners?: Set<LifecycleListener<T>>;   // Added by events.ts
  _notifyListeners?: Set<LifecycleListener<T>>;// Added by events.ts
  _mountListeners?: Set<LifecycleListener<T>>; // Added by events.ts
  _oldValueBeforeBatch?: T;                   // Added by batch.ts
  _notify(value: T, oldValue?: T): void;      // Base implementation in AtomProto
  _notifyBatch?(): void;                      // Added by batch.ts
  _patchedForEvents?: boolean;                // Added by events.ts
  _patchedForBatching?: boolean;              // Added by batch.ts
  // --- End optional properties ---

  [key: symbol]: any; // Allow extending with symbols
};

/**
 * Represents a read-only atom, often used for computed values.
 * It shares some properties with Atom but lacks the `set` method
 * and includes properties specific to derived state.
 */
export type ReadonlyAtom<T = any> = {
  get(): T;
  subscribe(fn: Listener<T>): Unsubscribe;
  _value: T;
  _listeners?: Set<Listener<T>>;
  // --- Optional properties added by patching (Events) ---
  _startListeners?: Set<LifecycleListener<T>>; // Added by events.ts
  _stopListeners?: Set<LifecycleListener<T>>;  // Added by events.ts
  _setListeners?: Set<LifecycleListener<T>>;   // Added by events.ts (though less common for readonly)
  _notifyListeners?: Set<LifecycleListener<T>>;// Added by events.ts
  _mountListeners?: Set<LifecycleListener<T>>; // Added by events.ts
  _notify(value: T, oldValue?: T): void;      // Base implementation (often overridden by computed)
  _notifyBatch?(): void;                      // Added by events.ts (less common for readonly)
  _patchedForEvents?: boolean;                // Added by events.ts
  // --- End optional event properties ---

  // --- Properties specific to computed/derived atoms ---
  _dirty?: boolean;                             // Is the current value outdated?
  _sources?: ReadonlyArray<Atom<any> | ReadonlyAtom<any>>; // Source atoms
  _sourceValues?: any[];                        // Last known values of sources
  _calculation?: Function;                      // Function to compute the derived value
  _equalityFn?: (a: T, b: T) => boolean;        // Custom equality check
  _unsubscribers?: Unsubscribe[];               // Functions to unsubscribe from sources
  _onChangeHandler?: Listener<any>;             // Bound handler for source changes
  _onChange?(): void;                           // Method called when a source changes
  _update?(): boolean;                          // Method to recompute the value if dirty
  _subscribeToSources?(): void;                // Method to subscribe to all sources
  _unsubscribeFromSources?(): void;            // Method to unsubscribe from all sources
  _isSubscribing?: boolean;                     // Flag to prevent recursive subscriptions
  // --- End computed properties ---

  [key: symbol]: any; // Allow extending with symbols
};


// --- Base Atom Prototype ---

/**
 * The base prototype shared by all atoms created via `atom()`.
 * Contains the minimal core logic for get, set, and subscribe.
 * Event and batching functionalities are added dynamically via patching.
 */
export const AtomProto: Atom<any> = {
  _value: undefined,

  get() { return this._value; },

  /**
   * Sets the atom's value.
   * Notifies listeners immediately if the value changes.
   * Batching logic, if enabled via patching, overrides this behavior.
   * @param value The new value.
   * @param force If true, notify listeners even if the value is the same.
   */
  set(value, force = false) {
    const oldValue = this._value;
    if (force || value !== oldValue) {
      this._value = value;
      // Base behavior: notify immediately. Patched version might defer.
      this._notify(value, oldValue);
    }
  },

  /**
   * Notifies all subscribed listeners about a value change.
   * This is the base implementation. Event patching might add more logic.
   * @param value The current value.
   * @param oldValue The previous value.
   */
  _notify(value, oldValue) {
    const ls = this._listeners;
    if (!ls || !ls.size) return;
    for (const fn of ls) {
      // Use the correct parameter names: value, oldValue
      fn && fn(value, oldValue);
    }
  },

  // `_notifyBatch` is added dynamically by batch.ts patching if needed.

  /**
   * Subscribes a listener function to the atom's changes.
   * Calls the listener immediately with the current value.
   * Returns an unsubscribe function.
   * Event patching might add `onStart`/`onStop` logic.
   * @param listener The function to call on value changes.
   * @returns A function to unsubscribe the listener.
   */
  subscribe(listener) {
    this._listeners ??= new Set();
    this._listeners.add(listener);

    // Lifecycle event `onStart` is handled by event patching if active.
    // We check `_listeners.size === 1` *after* adding, within the patched `subscribe`.

    listener(this._value, undefined); // Initial call with current value

    const self = this; // Capture `this` for the unsubscribe closure
    return function unsubscribe() {
      const listeners = self._listeners;
      if (!listeners) return; // Already unsubscribed everything

      listeners.delete(listener);

      if (!listeners.size) {
        delete self._listeners; // Clean up Set if empty
        // Lifecycle event `onStop` is handled by event patching if active.
      }
    };
  }
};

// Note: The `atom()` factory function itself resides in `atom.ts`.
