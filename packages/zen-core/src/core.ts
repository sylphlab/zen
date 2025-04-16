// Core type definitions and base prototype for the zen state management library.
import type { LifecycleListener } from './events';
import { isInBatch, queueAtomForBatch } from './batch';

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
  // _oldValueBeforeBatch is now managed internally by batch.ts's Map
  _notify(value: T, oldValue?: T): void;      // Base implementation in AtomProto
  // _notifyBatch is no longer needed
  // _patchedForEvents is no longer needed
  // _patchedForBatching is no longer needed
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
  // _notifyBatch is no longer needed
  // _patchedForEvents is no longer needed
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
    // Import isInBatch and queueAtomForBatch from batch.ts (assuming these will be exported)
    // We'll add the import later when modifying batch.ts
    // For now, assume functions `isInBatch` and `queueAtomForBatch` exist.
    if (force || !Object.is(value, oldValue)) { // Use Object.is for comparison consistency
        // Trigger onSet listeners BEFORE setting value, ONLY if not in batch
        if (!isInBatch()) {
            this._setListeners?.forEach(fn => {
                try { fn(value); } catch(e) { console.error(`Error in onSet listener for atom ${String(this)}:`, e); }
            });
        }

        this._value = value;

        // Check if currently in a batch
        // @ts-ignore - Assume isInBatch and queueAtomForBatch exist for now
        if (isInBatch()) {
            // @ts-ignore
            queueAtomForBatch(this, oldValue); // Queue for later notification
        } else {
            // Outside batch: notify immediately.
            this._notify(value, oldValue);
        }
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
    // Notify regular value listeners first
    if (ls?.size) {
        // Optimization: Create a copy if iterating while potentially modifying (though unlikely here)
        // const listenersToNotify = Array.from(ls);
        // for (const fn of listenersToNotify) {
        for (const fn of ls) { // Direct iteration usually fine for Set
            try {
                fn(value, oldValue);
            } catch (e) {
                console.error(`Error in value listener for atom ${String(this)}:`, e);
            }
        }
    }
    // Notify onNotify listeners AFTER value listeners
    this._notifyListeners?.forEach(fn => {
        try { fn(value); } catch(e) { console.error(`Error in onNotify listener for atom ${String(this)}:`, e); }
    });
  },

  // `_notifyBatch` will be removed as batching logic is refactored.

  /**
   * Subscribes a listener function to the atom's changes.
   * Calls the listener immediately with the current value.
   * Returns an unsubscribe function.
   * Event patching might add `onStart`/`onStop` logic.
   * @param listener The function to call on value changes.
   * @returns A function to unsubscribe the listener.
   */
  subscribe(listener) {
    const isFirstListener = !this._listeners?.size;
    this._listeners ??= new Set();
    this._listeners.add(listener);

    // Trigger onStart if this is the first listener
    if (isFirstListener) {
        this._startListeners?.forEach(fn => {
            try { fn(undefined); } catch(e) { console.error(`Error in onStart listener for atom ${String(this)}:`, e); }
        });
    }
    // onMount is handled by the onMount function itself

    // Initial call to the new listener
    try {
        listener(this._value, undefined);
    } catch (e) {
        console.error(`Error in initial listener call for atom ${String(this)}:`, e);
    }


    const self = this; // Capture `this` for the unsubscribe closure
    return function unsubscribe() {
      const listeners = self._listeners; // Use 'self'
      if (!listeners?.has(listener)) return; // Already unsubscribed or listener not found

      listeners.delete(listener);

      // Trigger onStop if this was the last listener
      if (!listeners.size) {
        delete self._listeners; // Clean up Set if empty
        self._stopListeners?.forEach(fn => { // Use 'self'
            // Note: Using String(self) might not be ideal for error messages, but keeps it consistent for now.
            try { fn(undefined); } catch(e) { console.error(`Error in onStop listener for atom ${String(self)}:`, e); }
        });
      }
    };
  }
};

// Note: The `atom()` factory function itself resides in `atom.ts`.