// Ultra-optimized state management core - Monster Edition
export type Listener<T> = (v: T, old?: T) => void;
export type Unsubscribe = () => void;

// Core interfaces
export interface Atom<T = any> {
  get(): T;
  set(v: T, force?: boolean): void;
  subscribe(fn: Listener<T>): Unsubscribe;
  _value: T;
  _listeners?: Set<Listener<T>>;
  _oldValueBeforeBatch?: T;
  _notify(v: T, old?: T): void;
  _notifyBatch(): void;
  [key: symbol]: any;
}

export interface ReadonlyAtom<T = any> {
  get(): T;
  subscribe(fn: Listener<T>): Unsubscribe;
  _value: T;
  _listeners?: Set<Listener<T>>;
  _oldValueBeforeBatch?: T;
  _notify(v: T, old?: T): void;
  _notifyBatch(): void;
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
}

// Batch system
export let batchDepth = 0;
export const batchQueue = new Set<Atom<any> | ReadonlyAtom<any>>();

export function batch<T>(fn: () => T): T {
  batchDepth++;
  try { return fn(); }
  finally {
    batchDepth--;
    if (batchDepth === 0 && batchQueue.size > 0) {
      const items = Array.from(batchQueue);
      batchQueue.clear();
      for (let i = 0; i < items.length; i++) items[i]?._notifyBatch();
    }
  }
}

// Base atom prototype
export const AtomProto: Atom<any> = {
  _value: undefined,
  
  get() { return this._value; },
  
  set(v, force = false) {
    const old = this._value;
    if (force || !Object.is(v, old)) {
      this._value = v;
      if (batchDepth > 0) {
        if (!batchQueue.has(this)) {
          this._oldValueBeforeBatch = old;
          batchQueue.add(this);
        }
      } else this._notify(v, old);
    }
  },
  
  _notify(v, old) {
    const ls = this._listeners;
    if (!ls || !ls.size) return;
    
    if (ls.size === 1) {
      const fn = ls.values().next().value;
      fn && fn(v, old);
      return;
    }
    
    if (ls.size <= 3) {
      for (const fn of ls) fn && fn(v, old);
      return;
    }
    
    const fns = Array.from(ls);
    for (let i = 0; i < fns.length; i++) {
      const fn = fns[i];
      fn && fn(v, old);
    }
  },
  
  _notifyBatch() {
    const old = this._oldValueBeforeBatch;
    const v = this._value;
    delete this._oldValueBeforeBatch;
    
    if (!Object.is(v, old)) this._notify(v, old);
  },
  
  subscribe(fn) {
    if (!this._listeners) this._listeners = new Set();
    this._listeners.add(fn);
    fn(this._value, undefined);
    
    const self = this;
    return function() {
      const ls = self._listeners;
      if (!ls) return;
      ls.delete(fn);
      if (!ls.size) delete self._listeners;
    };
  }
};

export function atom<T>(v: T): Atom<T> {
  const a = Object.create(AtomProto);
  a._value = v;
  return a;
}
