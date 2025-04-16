// Computed (derived state) implementation for the zen library.
import {
  Atom,
  ReadonlyAtom,
  Listener,
  Unsubscribe,
  AtomProto as CoreAtomProto // Import the base prototype
} from './core';
// Event patching is handled externally via ensurePatched in events.ts

// --- Types ---

/** Represents an array of source atoms (can be Atom or ReadonlyAtom). */
type Stores = ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;

/** Utility type to extract the value types from an array of Stores. */
type StoreValues<S extends Stores> = {
  [K in keyof S]: S[K] extends Atom<infer V> | ReadonlyAtom<infer V> ? V : never
};

/**
 * Internal type representing the structure of a computed atom instance.
 * Extends ReadonlyAtom and adds properties specific to derived state.
 */
type ComputedAtom<T> = ReadonlyAtom<T> & {
  // Required properties/methods for internal logic
  _sources: ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
  _sourceValues: any[];
  _calculation: Function; // Broad Function type for simplicity
  _equalityFn: (a: T, b: T) => boolean;
  _dirty: boolean;
  _isSubscribing: boolean; // Flag to prevent loops during initial subscription
  _update(): boolean; // Recalculates value if dirty, returns true if changed
  _onChange(): void; // Called when a source atom changes
  _subscribeToSources(): void; // Subscribes to all source atoms
  _unsubscribeFromSources(): void; // Unsubscribes from all source atoms

  // Optional properties (initialized lazily or can be undefined)
  _unsubscribers?: Unsubscribe[]; // Array of unsubscribe functions for sources
  _onChangeHandler?: () => void; // Bound listener for source changes
};


// --- Computed Atom Prototype ---

/**
 * Prototype for computed atoms. Inherits from CoreAtomProto and overrides
 * methods like `get` and `subscribe` to handle derived state logic.
 */
export const ComputedAtomProto: ComputedAtom<any> = {
  // Inherit base properties and methods (_value, _listeners, _notify)
  ...CoreAtomProto,

  // --- Computed-specific properties ---
  _sources: [],
  _sourceValues: [],
  _calculation: () => undefined,
  _equalityFn: Object.is, // Default equality check
  _dirty: true, // Start dirty, calculate on first get/subscribe
  _isSubscribing: false, // Flag for initial subscription phase
  // _unsubscribers and _onChangeHandler are implicitly undefined initially

  // --- Overridden Methods ---

  /**
   * Gets the computed value.
   * Subscribes to sources lazily on first access while active.
   * Recalculates the value only if marked as dirty.
   */
  get() {
    // Lazy subscription: Connect to sources only when accessed AND there are listeners
    if (this._listeners?.size && !this._unsubscribers) {
      this._subscribeToSources();
    }
    // Recalculate if dirty
    if (this._dirty) {
      this._update(); // This updates _value and resets _dirty
    }
    return this._value;
  },

  // `set` method is intentionally NOT overridden (it's a ReadonlyAtom).

  /**
   * Recalculates the computed value based on current source values.
   * Updates the internal `_value` and notifies listeners if the value changes.
   * @returns True if the value changed, false otherwise.
   */
  _update(): boolean {
    const srcs = this._sources;
    const vals = this._sourceValues;
    const calc = this._calculation;
    const old = this._value; // Capture value BEFORE recalculation

    // 1. Get current values from all source atoms
    for (let i = 0; i < srcs.length; i++) {
      // Use optional chaining for safety, though sources should exist
      vals[i] = srcs[i]?.get();
    }

    // 2. Calculate the new value
    const newValue = calc.apply(null, vals);
    this._dirty = false; // Mark as clean *after* calculation

    // 3. Check if the value actually changed using the equality function
    if (this._equalityFn(newValue, old)) {
      return false; // No change, exit early
    }

    // 4. Update internal value
    this._value = newValue;

    // 5. Notify listeners if not during the initial subscription phase.
    // Computed atoms do not participate in batching directly; they notify immediately.
    if (!this._isSubscribing) {
        // Call the potentially patched `_notify`.
        // If events are patched, this will also trigger `onNotify` listeners.
      this._notify(newValue, old);
    }
    return true; // Value changed
  },

  // `_notify` is inherited from CoreAtomProto (or its patched version).

  /**
   * Handler called when any source atom changes.
   * Marks the computed atom as dirty and triggers an update if active.
   */
  _onChange(): void {
    if (this._dirty) return;
    // If already dirty, no need to do anything further.
    if (this._dirty) return;

    this._dirty = true;

    // If there are active listeners, trigger an update immediately.
    // This propagates the change down the computed chain.
    if (this._listeners?.size) {
      this._update(); // This will recalculate and notify if the value changed
    }
    // If no listeners, we just stay dirty until the next `get()`.
  },

  /** Subscribes to all source atoms. */
  _subscribeToSources(): void {
    if (this._unsubscribers) return;
    // Avoid double subscriptions
    if (this._unsubscribers) return;

    const sources = this._sources;
    this._unsubscribers = new Array(sources.length);

    // Create and cache the bound onChange handler
    if (!this._onChangeHandler) {
      this._onChangeHandler = () => this._onChange();
    }

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      // Subscribe to each source using the cached handler
      if (source && this._onChangeHandler) {
        this._unsubscribers[i] = source.subscribe(this._onChangeHandler);
      }
    }
  },

  /** Unsubscribes from all source atoms. */
  _unsubscribeFromSources(): void {
    if (!this._unsubscribers) return;
    if (!this._unsubscribers) return; // Nothing to unsubscribe from

    for (const unsub of this._unsubscribers) {
      unsub?.(); // Call each unsubscribe function
    }
    this._unsubscribers = undefined; // Clear the array
    this._dirty = true; // Mark as dirty when inactive, forces recalc on next activation
  },

  /**
   * Overrides the base subscribe method.
   * Handles lazy subscription to sources and initial value calculation.
   * Interacts with event patching for `onStart`/`onStop`.
   */
  subscribe(listener: Listener<any>): Unsubscribe {
    const first = !this._listeners?.size;

    // 1. Initialize listeners set if it doesn't exist
    this._listeners ??= new Set();
    this._listeners.add(listener);

    // 2. Handle first subscriber logic (Trigger onStart)
    if (first) {
      this._subscribeToSources(); // Connect to upstream sources
      // Trigger onStart listeners directly
      this._startListeners?.forEach(fn => {
          try { fn(undefined); } catch(e) { console.error(`Error in onStart listener for computed atom ${String(this)}:`, e); }
      });
    }
    // Note: `onMount` is handled entirely by the `onMount` function itself.

    // 3. Ensure value is calculated and notify the new listener
    this._isSubscribing = true; // Prevent notifications during initial get
    const currentValue = this.get(); // Ensures calculation if dirty
    listener(currentValue, undefined); // Initial call with current value
    this._isSubscribing = false; // Clear flag after initial notification

    // 4. Return the unsubscribe function
    const self = this; // Capture `this` for the closure
    return function unsubscribe() {
      const listeners = self._listeners;
      if (!listeners) return; // Already fully unsubscribed

      listeners.delete(listener); // Remove this specific listener

      // If this was the last listener, disconnect from sources and trigger onStop
      if (listeners.size === 0) {
        self._unsubscribeFromSources();
        // Trigger onStop listeners directly
        self._stopListeners?.forEach(fn => {
            try { fn(undefined); } catch(e) { console.error(`Error in onStop listener for computed atom ${String(self)}:`, e); }
        });
        delete self._listeners; // Clean up the Set object
      }
    };
  }
};

// --- Factory Function ---

/**
 * Creates a read-only computed atom.
 * Its value is derived from one or more source atoms using a calculation function.
 *
 * @template T The type of the computed value.
 * @template S Tuple type of the source stores.
 * @param stores An array or tuple of source atoms (Atom or ReadonlyAtom).
 * @param calculation A function that takes the current values of the source stores
 *   as arguments and returns the computed value.
 * @param equalityFn Optional function to compare the old and new computed values.
 *   Defaults to `Object.is`. If it returns true, listeners are not notified.
 * @returns A ReadonlyAtom representing the computed value.
 */
export function computed<T, S extends Stores>(
  stores: S,
  calculation: (...values: StoreValues<S>) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is // Default to Object.is
): ReadonlyAtom<T> {
  // Create instance inheriting from ComputedAtomProto
  const atom = Object.create(ComputedAtomProto) as ComputedAtom<T>;

  // Initialize computed-specific properties
  atom._sources = stores;
  atom._sourceValues = new Array(stores.length); // Initialize array for source values
  atom._calculation = calculation as Function; // Store calculation function
  atom._equalityFn = equalityFn; // Store equality function
  atom._dirty = true; // Start dirty
  atom._isSubscribing = false; // Ensure flag is initialized correctly
  // _value will be calculated on first get/subscribe
  // _listeners, _unsubscribers, _onChangeHandler are initialized lazily

  return atom; // Return the configured computed atom instance
}
