// Ultra-optimized deep map implementation - Monster Edition
import { Atom, Listener, Unsubscribe, batchDepth, batchQueue } from './core';
import { atom } from './atom';
import { LIFECYCLE, emit, baseListenPaths, emitPaths, PathListener } from './events';
import { STORE_MAP_KEY_SET } from './keys';
import { Path, PathArray, getDeep, setDeep, getChangedPaths } from './deepMapInternal';

// DeepMap interface with path subscription
export interface DeepMap<T extends object> extends Atom<T> {
  setPath(path: Path, value: any, forceNotify?: boolean): void;
  listenPaths(paths: Path[], listener: PathListener<T>): Unsubscribe;
  [STORE_MAP_KEY_SET]?: boolean;
}

/**
 * Create a monster-optimized deep map for nested object state
 * @param initialValue Initial object state
 */
export function deepMap<T extends object>(initialValue: T): DeepMap<T> {
  // Create atom
  const baseAtom = atom<T>(initialValue);
  const deepMapAtom = baseAtom as DeepMap<T>;
  
  // Mark atom for path listeners
  deepMapAtom[STORE_MAP_KEY_SET] = true;
  
  // Track whether we're in setPath
  let isCalledBySetPath = false;
  
  // Track changed paths for batching
  let batchChangedPaths: Path[] | null = null;
  
  // Implement setPath method
  deepMapAtom.setPath = function(path: Path, value: any, forceNotify = false): void {
    if (!path || (Array.isArray(path) && path.length === 0) || path === '') {
      return; // Skip empty paths
    }
    
    const current = this.get();
    const newValue = setDeep(current, path, value);
    
    // Only update if value changed or forced
    if (forceNotify || newValue !== current) {
      // Flag that we're in setPath
      isCalledBySetPath = true;
      
      try {
        // Call base set method
        baseAtom.set(newValue, forceNotify);
        
        // Track changed path for batching
        if (batchDepth > 0) {
          if (!batchChangedPaths) batchChangedPaths = [];
          batchChangedPaths.push(path);
        } else {
          // Emit path change if not batching
          emitPaths(this, [path], newValue);
        }
      } finally {
        isCalledBySetPath = false;
      }
    }
  };
  
  // Override set method for full updates
  const originalSet = deepMapAtom.set;
  deepMapAtom.set = function(newValue: T, forceNotify = false): void {
    // If called by setPath, just delegate
    if (isCalledBySetPath) {
      originalSet.call(this, newValue, forceNotify);
      return;
    }
    
    // Get old value
    const oldValue = this._value;
    
    // Only update if different or forced
    if (forceNotify || !Object.is(newValue, oldValue)) {
      // Call original set (handles batching, notify, etc.)
      originalSet.call(this, newValue, forceNotify);
      
      // Calculate changed paths
      const changedPaths = getChangedPaths(oldValue, newValue);
      
      // Handle path emissions
      if (batchDepth > 0) {
        if (!batchChangedPaths) batchChangedPaths = [];
        // Store paths for batch processing
        batchChangedPaths.push(...changedPaths);
      } else if (changedPaths.length) {
        // Immediate notification
        emitPaths(this, changedPaths, newValue);
      }
    }
  };
  
  // Implement listenPaths
  deepMapAtom.listenPaths = function(paths: Path[], listener: PathListener<T>): Unsubscribe {
    return baseListenPaths(this, paths, listener);
  };
  
  // Override _notifyBatch to handle path emissions
  const originalNotifyBatch = deepMapAtom._notifyBatch;
  deepMapAtom._notifyBatch = function() {
    const oldValue = this._oldValueBeforeBatch;
    
    // Call original batch notification
    originalNotifyBatch.call(this);
    
    // Emit path changes after batch
    if (batchChangedPaths?.length && oldValue) {
      const newValue = this._value;
      // We processed all the paths, so this will be the final notification
      emitPaths(this, batchChangedPaths, newValue);
      batchChangedPaths = null;
    }
  };
  
  return deepMapAtom;
}
