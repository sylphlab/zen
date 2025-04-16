// Ultra-optimized state management core - Monster Edition (v9 - Minimal Proto)
import type { LifecycleListener } from './events';

export type Listener<T> = (v: T, old?: T) => void;
export type Unsubscribe = () => void;

// Core types
export type Atom<T = any> = {
  get(): T;
  set(v: T, force?: boolean): void;
  subscribe(fn: Listener<T>): Unsubscribe;
  _value: T;
  _listeners?: Set<Listener<T>>;
  // Optional properties for patching mechanisms (events & batching)
  _startListeners?: Set<LifecycleListener<T>>;
  _stopListeners?: Set<LifecycleListener<T>>;
  _setListeners?: Set<LifecycleListener<T>>;
  _notifyListeners?: Set<LifecycleListener<T>>;
  _mountListeners?: Set<LifecycleListener<T>>;
  _oldValueBeforeBatch?: T; // Added by batch patching
  _notify(v: T, old?: T): void;
  _notifyBatch?(): void; // Added by batch patching
  _patchedForEvents?: boolean;
  _patchedForBatching?: boolean; // Added by batch patching
  [key: symbol]: any;
};

export type ReadonlyAtom<T = any> = {
  get(): T;
  subscribe(fn: Listener<T>): Unsubscribe;
  _value: T;
  _listeners?: Set<Listener<T>>;
  // Optional properties for event patching
  _startListeners?: Set<LifecycleListener<T>>;
  _stopListeners?: Set<LifecycleListener<T>>;
  _setListeners?: Set<LifecycleListener<T>>;
  _notifyListeners?: Set<LifecycleListener<T>>;
  _mountListeners?: Set<LifecycleListener<T>>;
  _notify(v: T, old?: T): void;
  _notifyBatch?(): void; // Added by event patching
  _patchedForEvents?: boolean;
  // No batching props needed
  _dirty?: boolean;
  _sources?: ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
  _sourceValues?: any[];
  _calculation?: Function;
  _equalityFn?: (a: T, b: T) => boolean;
  _unsubscribers?: Unsubscribe[];
  _onChangeHandler?: Listener<any>;
  _onChange?(): void;
  _update?(): boolean;
  _subscribeToSources?(): void;
  _unsubscribeFromSources?(): void;
  _isSubscribing?: boolean;
  [key: symbol]: any;
};


// Base atom prototype (Minimal - no event/batch logic here)
export const AtomProto: Atom<any> = {
  _value: undefined,

  get() { return this._value; },

  // Base set method - NO batching logic
  set(v, force = false) {
    const old = this._value;
    if (force || v !== old) {
      this._value = v;
      this._notify(v, old); // Always notify immediately
    }
  },

  // Minimal notify, no event logic
  _notify(v, old) {
    const ls = this._listeners;
    if (!ls || !ls.size) return;
    for (const fn of ls) {
      fn && fn(v, old);
    }
  },

  // _notifyBatch is added dynamically by batch patching if needed

  // Minimal subscribe, no event logic
  subscribe(fn) {
    this._listeners ??= new Set();
    this._listeners.add(fn);
    fn(this._value, undefined); // Initial call

    const self = this;
    return function() {
      const ls = self._listeners;
      if (!ls) return;
      ls.delete(fn);
      if (!ls.size) delete self._listeners;
      // onStop is handled by event patching if active
    };
  }
};

// Atom factory function is now in atom.ts
