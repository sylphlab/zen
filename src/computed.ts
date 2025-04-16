// Monster-optimized computed implementation
import {
  Atom,
  ReadonlyAtom,
  Listener,
  Unsubscribe,
  batchDepth,
  batchQueue,
} from './core';
import { LIFECYCLE, emit } from './events';
import { AtomProto } from './atom';

// Types
type Stores = ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
type StoreValues<S extends Stores> = {
  [K in keyof S]: S[K] extends Atom<infer V> | ReadonlyAtom<infer V> ? V : never
};

// ComputedAtom type with required methods
interface ComputedAtom<T> extends ReadonlyAtom<T> {
  _sources: ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
  _sourceValues: any[];
  _calculation: Function;
  _equalityFn: (a: T, b: T) => boolean;
  _dirty: boolean;
  _isSubscribing: boolean;
  _unsubscribers?: Unsubscribe[];
  _onChangeHandler?: () => void;
  _update(): boolean;
  _onChange(): void;
  _subscribeToSources(): void;
  _unsubscribeFromSources(): void;
  set(v: T, force?: boolean): void; // Add set method to interface
}

// Optimized computed atom implementation
export const ComputedAtomProto: ComputedAtom<any> = {
  ...AtomProto, // Include all base atom methods and properties
  _sources: [],
  _sourceValues: [],
  _calculation: () => undefined,
  _equalityFn: Object.is,
  _dirty: true,
  _isSubscribing: false,
  
  // Override get method for computed values
  get() {
    if (this._listeners?.size && !this._unsubscribers) {
      this._subscribeToSources();
    }
    if (this._dirty) {
      this._update();
    }
    return this._value;
  },
  
  // No-op set method (computed values are read-only)
  set() {
    // No-op for computed values
  },
  
  // Calculate and update value if needed
  _update() {
    // Cache frequently accessed properties
    const srcs = this._sources;
    const vals = this._sourceValues;
    const calc = this._calculation;
    const old = this._value;
    
    // Read all source values
    for (let i = 0; i < srcs.length; i++) {
      vals[i] = srcs[i]?.get();
    }
    
    // Calculate new value
    const v = calc.apply(null, vals);
    this._dirty = false;
    
    // Skip update if value hasn't changed
    if (this._equalityFn(v, old)) return false;
    
    // Update value
    this._value = v;
    
    // Handle batching
    if (batchDepth > 0) {
      if (!batchQueue.has(this)) {
        this._oldValueBeforeBatch = old;
        batchQueue.add(this);
      }
    } else {
      // Only notify and emit onNotify if not during initial subscription
      if (!this._isSubscribing) {
        this._notify(v, old);
        emit(this, LIFECYCLE.onNotify, v);
      }
    }
    
    return true;
  },
  
  // Handle notification after batch
  _notifyBatch() {
    const old = this._oldValueBeforeBatch;
    const v = this._value;
    delete this._oldValueBeforeBatch;
    
    if (!Object.is(v, old)) {
      this._notify(v, old);
      emit(this, LIFECYCLE.onNotify, v);
    }
  },
  
  // Override _notify method for safety
  _notify(v, old) {
    const ls = this._listeners;
    if (!ls || !ls.size) return;
    
    // Fast path for single listener
    if (ls.size === 1) {
      const fn = Array.from(ls)[0];
      fn?.(v, old); // Use optional chaining
      return;
    }
    
    // Safe iteration for multiple listeners
    const fns = Array.from(ls);
    for (let i = 0; i < fns.length; i++) {
      fns[i]?.(v, old); // Use optional chaining
    }
  },
  
  // Mark computed value as dirty when sources change
  _onChange() {
    if (this._dirty) return;
    this._dirty = true;
    
    if (!this._listeners?.size) return;
    
    if (batchDepth > 0) {
      if (!batchQueue.has(this)) {
        this._oldValueBeforeBatch = this._value;
        batchQueue.add(this);
      }
    } else {
      this._update();
    }
  },
  
  // Subscribe to source atoms
  _subscribeToSources() {
    if (this._unsubscribers) return;
    
    const srcs = this._sources;
    this._unsubscribers = new Array(srcs.length);
    
    // Create change handler if needed
    if (!this._onChangeHandler) {
      const self = this;
      this._onChangeHandler = () => self._onChange();
    }
    
    // Subscribe to all sources
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
    
    // Unsubscribe from all sources
    for (let i = 0; i < this._unsubscribers.length; i++) {
      this._unsubscribers[i]?.(); // Use optional chaining
    }
    
    this._unsubscribers = undefined;
    this._dirty = true;
  },
  
  // Override subscribe method to handle computed-specific behavior
  subscribe(fn: Listener<any>): Unsubscribe {
    const first = !this._listeners?.size;
    
    // Initialize listeners set if needed
    if (!this._listeners) this._listeners = new Set();
    this._listeners.add(fn);
    
    // Handle first subscriber
    if (first) {
      this._subscribeToSources();
      emit(this, LIFECYCLE.onStart);
    }
    
    emit(this, LIFECYCLE.onMount, fn);
    
    // Flag to prevent duplicate notifications
    this._isSubscribing = true;
    
    // Get current value and directly notify the new listener
    const v = this.get();
    fn(v, undefined);
    
    // Clear flag after notification
    this._isSubscribing = false;
    
    // Return unsubscribe function
    const self = this;
    return function unsubscribe() {
      const ls = self._listeners;
      if (!ls) return;
      
      ls.delete(fn);
      
      if (ls.size === 0) {
        self._unsubscribeFromSources();
        emit(self, LIFECYCLE.onStop);
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
  // Create computed atom instance
  const atom = Object.create(ComputedAtomProto) as ComputedAtom<T>;
  
  // Initialize properties
  atom._sources = stores;
  atom._sourceValues = new Array(stores.length);
  atom._calculation = calculation as Function;
  atom._equalityFn = equalityFn;
  atom._dirty = true;
  atom._isSubscribing = false;
  
  return atom;
}
