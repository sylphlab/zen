// Ultra-optimized deep map implementation - Monster Edition
import { Atom, Listener, Unsubscribe } from './core'; // REMOVED batchDepth, batchQueue
import { atom } from './atom';
import { listenPaths, _emitPathChanges, PathListener } from './events';
import { STORE_MAP_KEY_SET } from './keys';
import { Path, PathArray, getDeep, setDeep, getChangedPaths } from './deepMapInternal';

// DeepMap type alias with path subscription
export type DeepMap<T extends object> = Atom<T> & {
  setPath(path: Path, value: any, forceNotify?: boolean): void;
  listenPaths(paths: Path[], listener: PathListener<T>): Unsubscribe;
  [STORE_MAP_KEY_SET]?: boolean;
};

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
  
  // REMOVED batchChangedPaths tracking - Handled by patching
  
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
        
        // No batch tracking here. Emit immediately.
        // Patching mechanism will intercept if batch is active.
         _emitPathChanges(this, [path], newValue);
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
      
      // Always emit path changes immediately (no batching here)
      // Patching mechanism will intercept if batch is active.
      if (changedPaths.length) {
        _emitPathChanges(this, changedPaths, newValue);
      }
    }
  };
  
  // Implement listenPaths
  deepMapAtom.listenPaths = function(paths: Path[], listener: PathListener<T>): Unsubscribe {
    return listenPaths(this, paths, listener);
  };
  
  // REMOVED _notifyBatch override - Batching will be handled by patching

  return deepMapAtom;
}
