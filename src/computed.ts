// Monster-optimized computed implementation
import {
  Atom,
  ReadonlyAtom,
  Listener,
  Unsubscribe,
  // REMOVED batchDepth, batchQueue
} from './core';
// No event imports needed
import { AtomProto as CoreAtomProto } from './core';

// Types
type Stores = ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
type StoreValues<S extends Stores> = {
  [K in keyof S]: S[K] extends Atom<infer V> | ReadonlyAtom<infer V> ? V : never
};

// ComputedAtom type alias with required methods
type ComputedAtom<T> = ReadonlyAtom<T> & {
  _sources: ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
  _sourceValues: any[];
  _calculation: Function; // Using Function type broadly here
  _equalityFn: (a: T, b: T) => boolean;
  _dirty: boolean;
  _isSubscribing: boolean; // Keep for internal logic
  _unsubscribers?: Unsubscribe[];
  _onChangeHandler?: () => void;
  _update(): boolean;
  _onChange(): void;
  _subscribeToSources(): void;
  _unsubscribeFromSources(): void;
  // No set method for ReadonlyAtom
};

// Optimized computed atom implementation
// Inherits from CoreAtomProto, overrides necessary methods
export const ComputedAtomProto: ComputedAtom<any> = {
  ...CoreAtomProto, // Use CoreAtomProto as base
  _sources: [],
  _sourceValues: [],
  _calculation: () => undefined,
  _equalityFn: Object.is,
  _dirty: true,
  _isSubscribing: false, // Initialize internal flag

  // Override get method for computed values
  get() {
    // Subscribe to sources only when needed (first get after becoming active)
    if (this._listeners?.size && !this._unsubscribers) {
      this._subscribeToSources();
    }
    // Recalculate if dirty
    if (this._dirty) {
      this._update();
    }
    return this._value;
  },

  // REMOVED incorrect set method override

  // Calculate and update value if needed
  _update() {
    const srcs = this._sources;
    const vals = this._sourceValues;
    const calc = this._calculation;
    const old = this._value; // Capture value BEFORE recalculation

    for (let i = 0; i < srcs.length; i++) {
      vals[i] = srcs[i]?.get();
    }

    const v = calc.apply(null, vals);
    this._dirty = false;

    if (this._equalityFn(v, old)) return false; // No change

    this._value = v; // Update internal value

    // Always notify immediately (no batching)
    // Only notify if not during initial subscription
    if (!this._isSubscribing) {
        // Call _notify (might be original or patched version)
        // The patched version will handle triggering onNotify listeners
      this._notify(v, old);
    }
    return true;
  },

  // REMOVED _notifyBatch method

  // _notify: Use the inherited one from CoreAtomProto (or the patched one)
  // No need to override _notify here anymore, patching handles event logic

  // Mark computed value as dirty when sources change
  _onChange() {
    if (this._dirty) return;
    this._dirty = true;
    if (!this._listeners?.size) return; // No need to update if no listeners

    // Always trigger update immediately (no batching)
    this._update();
  },

  // Subscribe to source atoms
  _subscribeToSources() {
    if (this._unsubscribers) return;
    const srcs = this._sources;
    this._unsubscribers = new Array(srcs.length);
    if (!this._onChangeHandler) {
      const self = this;
      this._onChangeHandler = () => self._onChange();
    }
    for (let i = 0; i < srcs.length; i++) {
      const src = srcs[i];
      if (src && this._onChangeHandler) {
        this._unsubscribers[i] = src.subscribe(this._onChangeHandler);
      }
    }
  },

  // Unsubscribe from source atoms
  _unsubscribeFromSources() {
    if (!this._unsubscribers) return;
    for (let i = 0; i < this._unsubscribers.length; i++) {
      this._unsubscribers[i]?.();
    }
    this._unsubscribers = undefined;
    this._dirty = true; // Mark as dirty when inactive
  },

  // Override subscribe method to handle computed-specific behavior + patching interaction
  subscribe(fn: Listener<any>): Unsubscribe {
    const first = !this._listeners?.size;

    // Initialize listeners set if needed
    if (!this._listeners) this._listeners = new Set();
    this._listeners.add(fn);

    // Handle first subscriber - connect to sources
    if (first) {
      this._subscribeToSources();
      // onStart event is handled by the patched subscribe method (if patched)
    }
    // onMount event is handled by the onMount function itself

    // Ensure value is calculated before initial notification
    this._isSubscribing = true; // Set flag
    this.get(); // Ensure calculation happens if dirty
    const v = this._value;
    fn(v, undefined); // Initial notification
    this._isSubscribing = false; // Clear flag

    // Return unsubscribe function
    // The patched subscribe method (if applied) will wrap this return value
    const self = this;
    return function unsubscribe() {
      const ls = self._listeners;
      if (!ls) return;
      ls.delete(fn);
      if (ls.size === 0) {
        self._unsubscribeFromSources();
        // onStop event is handled by the patched subscribe method (if patched)
        delete self._listeners; // Clean up listener set
      }
    };
  }
};

/**
 * Create a computed atom that derives its value from other atoms
 */
export function computed<T, S extends Stores>(
  stores: S,
  calculation: (...values: StoreValues<S>) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is
): ReadonlyAtom<T> {
  const atom = Object.create(ComputedAtomProto) as ComputedAtom<T>;
  atom._sources = stores;
  atom._sourceValues = new Array(stores.length);
  atom._calculation = calculation as Function;
  atom._equalityFn = equalityFn;
  atom._dirty = true;
  atom._isSubscribing = false; // Ensure flag is initialized
  return atom;
}
