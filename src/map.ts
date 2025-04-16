// Ultra-optimized map implementation - Monster Edition
import { Atom, Listener, Unsubscribe } from './core';
import { atom } from './atom';
import { listenKeys, _emitKeyChanges, KeyListener } from './events'; // Use internal symbols/emit
import { STORE_MAP_KEY_SET } from './keys';

// Map type alias with key subscription
export type MapAtom<T extends object> = Atom<T> & {
  setKey<K extends keyof T>(key: K, value: T[K], forceNotify?: boolean): void;
  listenKeys<K extends keyof T>(keys: K[], listener: KeyListener<T, K>): Unsubscribe;
  [STORE_MAP_KEY_SET]?: boolean;
};

/**
 * Create a monster-optimized Map atom for object state
 * @param initialValue Initial object state
 */
export function map<T extends object>(initialValue: T): MapAtom<T> {
  // Create atom with a shallow copy of initial value
  const baseAtom = atom<T>({ ...initialValue });
  const mapAtom = baseAtom as MapAtom<T>;
  
  // Mark atom as supporting key listeners
  mapAtom[STORE_MAP_KEY_SET] = true;
  
  // Track whether we're inside setKey to avoid duplicating work
  let isCalledBySetKey = false;
  
  // REMOVED batchChangedKeys tracking
  
  // Optimized setKey method
  mapAtom.setKey = function <K extends keyof T>(key: K, value: T[K], forceNotify = false): void {
    const current = this._value;
    // Only update if value changed or forced
    if (forceNotify || !Object.is(current[key], value)) {
      // Create new value immutably
      const newValue = { ...current, [key]: value };
      
      // Flag that we're in setKey
      isCalledBySetKey = true;
      
      try {
        // Call base set method
        baseAtom.set(newValue, forceNotify);
        
        // No batch tracking here. Emit immediately.
        // Patching mechanism will intercept if batch is active.
        _emitKeyChanges(this, [key], newValue);
      } finally {
        isCalledBySetKey = false;
      }
    }
  };
  
  // Override set method to handle key emission
  const originalSet = baseAtom.set;
  mapAtom.set = function(newValue: T, forceNotify = false): void {
    // If called by setKey, just delegate
    if (isCalledBySetKey) {
      originalSet.call(this, newValue, forceNotify);
      return;
    }
    
    // Full object update logic
    const oldValue = this._value;
    if (forceNotify || !Object.is(newValue, oldValue)) {
      // Calculate changed keys 
      const changedKeys: (keyof T)[] = [];
      const oldKeys = Object.keys(oldValue) as (keyof T)[];
      const newKeys = Object.keys(newValue) as (keyof T)[];
      
      // Check old keys for changes/removals
      for (const k of oldKeys) {
        if (!Object.is(oldValue[k], newValue[k])) {
          changedKeys.push(k);
        }
      }
      
      // Check for new keys
      for (const k of newKeys) {
        if (!(k in oldValue) && !changedKeys.includes(k)) {
          changedKeys.push(k);
        }
      }
      
      // Call base set method
      originalSet.call(this, newValue, forceNotify);
      
      // Always emit key changes immediately (no batching here)
      // Patching mechanism will intercept if batch is active.
      if (changedKeys.length) {
        _emitKeyChanges(this, changedKeys, newValue);
      }
    }
  };
  
  // Implement listenKeys
  mapAtom.listenKeys = function<K extends keyof T>(keys: K[], listener: KeyListener<T, K>): Unsubscribe {
    return listenKeys(this, keys, listener);
  };
  
  // REMOVED _notifyBatch override - Batching will be handled by patching

  return mapAtom;
}
