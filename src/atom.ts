// Ultra-optimized atom implementation - Monster Edition
import { Atom, Listener, Unsubscribe, batchDepth, batchQueue } from './core';
import { LIFECYCLE, emit } from './events';

// Base atom prototype - now exported
export const AtomProto: Atom<any> = {
  _value: undefined,
  
  get() {
    return this._value;
  },
  
  set(v, force = false) {
    const old = this._value;
    
    // Only update if value changed or forced
    if (force || !Object.is(v, old)) {
      // Emit onSet before updating
      emit(this, LIFECYCLE.onSet, v);
      
      // Update value
      this._value = v;
      
      // Handle batching
      if (batchDepth > 0) {
        if (!batchQueue.has(this)) {
          this._oldValueBeforeBatch = old;
          batchQueue.add(this);
        }
      } else {
        // Notify immediately
        this._notify(v, old);
      }
    }
  },
  
  _notify(v, old) {
    const ls = this._listeners;
    if (!ls || !ls.size) return;
    
    // Ultra-optimized iteration based on listener count
    if (ls.size === 1) {
      const fn = ls.values().next().value;
      fn?.(v, old); // Use optional chaining to avoid undefined call
    } else {
      // For multiple listeners, create a copy to ensure safe iteration
      const fns = Array.from(ls);
      for (let i = 0; i < fns.length; i++) {
        const fn = fns[i];
        if (fn) fn(v, old);
      }
    }
    
    // Emit onNotify after notifying listeners
    emit(this, LIFECYCLE.onNotify, v);
  },
  
  _notifyBatch() {
    const old = this._oldValueBeforeBatch;
    const v = this._value;
    
    // Clear stored old value
    delete this._oldValueBeforeBatch;
    
    // Only notify if value actually changed
    if (!Object.is(v, old)) {
      this._notify(v, old);
    }
  },
  
  subscribe(fn) {
    const first = !this._listeners || this._listeners.size === 0;
    
    // Initialize listeners if needed
    if (!this._listeners) this._listeners = new Set();
    this._listeners.add(fn);
    
    // Emit lifecycle events
    if (first) {
      emit(this, LIFECYCLE.onStart);
    }
    emit(this, LIFECYCLE.onMount, fn);
    
    // Immediate notification with current value
    fn(this._value, undefined);
    
    // Return unsubscribe function
    const self = this;
    return function() {
      const ls = self._listeners;
      if (!ls) return;
      
      ls.delete(fn);
      
      // Emit onStop when last listener unsubscribes
      if (ls.size === 0) {
        emit(self, LIFECYCLE.onStop);
      }
    };
  }
};

/**
 * Create a monster-optimized atom for state management
 * @param initialValue Initial state value
 */
export function atom<T>(initialValue: T): Atom<T> {
  const a = Object.create(AtomProto);
  a._value = initialValue;
  return a;
}
