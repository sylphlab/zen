// Ultra-optimized map implementation - Monster Edition
import { Atom, Listener, Unsubscribe, batchDepth, batchQueue } from './core';
import { atom } from './atom';
import { LIFECYCLE, emit, listenKeys as baseListenKeys, emitKeys, KeyListener } from './events';
import { STORE_MAP_KEY_SET } from './keys';

// Map interface with key subscription
export interface MapAtom<T extends object> extends Atom<T> {
  setKey<K extends keyof T>(key: K, value: T[K], forceNotify?: boolean): void;
  listenKeys<K extends keyof T>(keys: K[], listener: KeyListener<T, K>): Unsubscribe;
  [STORE_MAP_KEY_SET]?: boolean;
}

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
  
  // Track changed keys for batch processing
  let batchChangedKeys: Set<keyof T> | null = null;
  
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
        
        // Track changed keys for batching
        if (batchDepth > 0) {
          if (!batchChangedKeys) batchChangedKeys = new Set();
          batchChangedKeys.add(key);
        } else {
          // Emit key change if not batching
          emitKeys(this, [key], newValue);
        }
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
      
      // Handle key emissions
      if (batchDepth > 0) {
        if (!batchChangedKeys) batchChangedKeys = new Set();
        // Add all changed keys to batch
        changedKeys.forEach(k => batchChangedKeys!.add(k));
      } else if (changedKeys.length) {
        // Immediate notification
        emitKeys(this, changedKeys, newValue);
      }
    }
  };
  
  // Implement listenKeys
  mapAtom.listenKeys = function<K extends keyof T>(keys: K[], listener: KeyListener<T, K>): Unsubscribe {
    return baseListenKeys(this, keys, listener);
  };
  
  // Override _notifyBatch to handle key emissions
  const originalNotifyBatch = baseAtom._notifyBatch;
  mapAtom._notifyBatch = function() {
    const oldValue = this._oldValueBeforeBatch;
    
    // Call original batch notification
    originalNotifyBatch.call(this);
    
    // Emit key changes after batch completes
    if (batchChangedKeys?.size && oldValue) {
      const newValue = this._value;
      emitKeys(this, Array.from(batchChangedKeys), newValue);
      batchChangedKeys = null;
    }
  };
  
  return mapAtom;
}
