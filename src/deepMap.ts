// Deep Map Helper (Restoring Features)

import { Atom, Listener, Unsubscribe, batchDepth, batchQueue } from './core';
import { atom } from './atom';
import { LIFECYCLE, emit, baseListenPaths, emitPaths, PathListener } from './events'; // Import baseListenPaths
import { STORE_MAP_KEY_SET } from './keys';
// Import helpers and Path type from the internal file
import { getDeep, setDeep, Path, getChangedPaths } from './deepMapInternal';

// DeepMap Interface with Path Subscription
export interface DeepMap<T extends object> extends Atom<T> {
  setPath: (path: Path, value: any, forceNotify?: boolean) => void; // Renamed setKey back to setPath
  // Add listenPaths signature for deep path listening
  listenPaths(paths: Path[], listener: PathListener<T>): Unsubscribe; // Placeholder listener type
  // Mark atom as supporting path listeners
  [STORE_MAP_KEY_SET]?: boolean; // Re-using symbol, maybe rename later?
}

/**
 * Create a store for managing deep objects.
 * Allows setting and potentially subscribing to changes at specific deep paths.
 *
 * @param initialValue Initial object value.
 * @returns A deep map store.
 */
export function deepMap<T extends object>(initialValue: T): DeepMap<T> {
  const store = atom(initialValue);
  const deepMapStore = store as DeepMap<T>;

  // Mark the atom for path listeners
  deepMapStore[STORE_MAP_KEY_SET] = true; // Re-using symbol

  deepMapStore.setPath = (path: Path, value: any, forceNotify: boolean = false): void => {
    const current = store.get();
    const newValue = setDeep(current, path, value); // Use setDeep

    // Use simplified set if value changed
    if (forceNotify || newValue !== current) {
        // Call the overridden set method, which handles batching, onSet, _notify, onNotify, and emitPaths via _notifyBatch
        store.set(newValue, forceNotify);
    }
  };

  // Override the base 'set' method to handle path emission for full object updates
  const originalSet = deepMapStore.set; // Keep reference to original prototype set
  deepMapStore.set = function (newValue: T, forceNotify: boolean = false): void {
    const oldValue = this._value;
    if (forceNotify || !Object.is(newValue, oldValue)) {
        // Call original set logic (handles batching, onSet, _notify, onNotify)
        originalSet.call(this, newValue, forceNotify);

        // After original set logic (which includes _notify), emit path changes if not batching
        if (batchDepth === 0) {
            // Assuming getChangedPaths exists and returns Path[]
            const changedPaths = getChangedPaths(oldValue, newValue);
            if (changedPaths.length > 0) {
                emitPaths(this, changedPaths, newValue); // Emit changed paths
            }
        }
        // TODO: Handle path emission correctly during batching (maybe in _notifyBatch override?)
    }
  };


  // Implement listenPaths
  deepMapStore.listenPaths = function (paths: Path[], listener: PathListener<T>): Unsubscribe {
    // Delegate to the baseListenPaths function from events.ts
    return baseListenPaths(this, paths, listener);
  };

  // Override _notifyBatch to handle emitPaths correctly after batch completes
  const originalNotifyBatch = deepMapStore._notifyBatch;
  deepMapStore._notifyBatch = function() {
    const oldValue = this._oldValueBeforeBatch; // Get stored old value
    // Call original batch notify (handles listeners and clears _oldValueBeforeBatch)
    originalNotifyBatch.call(this);
    // Now oldValue is defined (if a change occurred in the batch) and _oldValueBeforeBatch is cleared

    // If oldValue exists (meaning a change happened), calculate and emit changed paths
    if (oldValue !== undefined) {
      const newValue = this._value;
      const changedPaths = getChangedPaths(oldValue, newValue);
      if (changedPaths.length > 0) {
          emitPaths(this, changedPaths, newValue);
      }
    }
  };

  return deepMapStore;
}
