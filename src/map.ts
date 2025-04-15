// Minimal Map Helper (Restoring Features)

import { Atom, Listener, Unsubscribe, batchDepth, batchQueue } from './core';
import { atom } from './atom';
import { LIFECYCLE, emit, listenKeys as baseListenKeys, emitKeys, KeyListener } from './events'; // Import event/key tools
import { STORE_MAP_KEY_SET } from './keys'; // Import key symbol

// Map Atom Interface with Key Subscription
export interface MapAtom<T extends object> extends Atom<T> {
  setKey<K extends keyof T>(key: K, value: T[K], forceNotify?: boolean): void;
  // Add listenKeys signature
  listenKeys<K extends keyof T>(keys: K[], listener: KeyListener<T, K>): Unsubscribe;
  // Mark atom as supporting key listeners
  [STORE_MAP_KEY_SET]?: boolean;
}

/**
 * 创建一个优化的 map atom (对象 atom)。
 * 提供 setKey 方法用于高效更新单个属性。
 *
 * @param initialValue 初始对象状态
 * @returns MapAtom 实例
 */
export function map<T extends object>(initialValue: T): MapAtom<T> {
  // Start with a shallow copy
  const baseAtom = atom<T>({ ...initialValue });
  const enhancedAtom = baseAtom as MapAtom<T>;

  // Mark the atom for key listeners
  enhancedAtom[STORE_MAP_KEY_SET] = true;

  let isCalledBySetKey = false; // Flag to differentiate calls

  // Override setKey: Directly call originalSet and manually emitKeys for the single key
  enhancedAtom.setKey = function <K extends keyof T>(key: K, value: T[K], forceNotify: boolean = false): void {
      const current = this._value;
      if (forceNotify || !Object.is(current[key], value)) {
          // Create the new value *only* for the originalSet call
          const newValue = { ...current, [key]: value };
          isCalledBySetKey = true; // Set flag
          try {
              // Call the *original* atom set logic (handles batching, onSet, _notify, onNotify)
              // We bypass the overridden set's key emission logic
              (baseAtom.set as Function).call(this, newValue, forceNotify); // Use baseAtom.set

              // Manually emitKeys for the single changed key *if not batching*
              // If batching, the overridden _notifyBatch will handle it
              if (batchDepth === 0) {
                  emitKeys(this, [key], newValue);
              }
          } finally {
              isCalledBySetKey = false; // Reset flag
          }
      }
  };

  // Override the base 'set' method to handle key emission *only* for full object updates
  const originalSet = baseAtom.set; // Keep reference to original prototype set
  enhancedAtom.set = function (newValue: T, forceNotify: boolean = false): void {
    // If called by setKey, just call the original set and return
    if (isCalledBySetKey) {
        originalSet.call(this, newValue, forceNotify);
        return;
    }

    // Otherwise, proceed with full object update logic
    const oldValue = this._value;
    if (forceNotify || !Object.is(newValue, oldValue)) {
        // Call original set logic (handles batching, onSet, _notify, onNotify)
        originalSet.call(this, newValue, forceNotify);

        // After original set logic, emit key changes *only if not batching*
        // and *only if not called by setKey*
        if (batchDepth === 0) {
            // Calculate changed keys ONLY for full set calls
            const changedKeys = Object.keys(newValue).filter(
                k => !Object.is(newValue[k as keyof T], oldValue?.[k as keyof T])
            ) as (keyof T)[];
            if (changedKeys.length > 0) {
                emitKeys(this, changedKeys, newValue);
            }
        }
    }
  };

  // Implement listenKeys
  enhancedAtom.listenKeys = function <K extends keyof T>(keys: K[], listener: KeyListener<T, K>): Unsubscribe {
    // Delegate to the base listenKeys function from events.ts
    return baseListenKeys(this, keys, listener);
  };

  // Override _notifyBatch to handle emitKeys correctly after batch completes
  const originalNotifyBatch = baseAtom._notifyBatch; // Use base atom's notifyBatch
  enhancedAtom._notifyBatch = function() {
    const oldValue = this._oldValueBeforeBatch; // Get stored old value before original call clears it

    // Call original batch notify (handles listeners and clears _oldValueBeforeBatch)
    originalNotifyBatch.call(this);

    // If oldValue exists (meaning a change happened in the batch), calculate and emit changed keys
    // This handles both setKey and full set calls within a batch
    if (oldValue !== undefined) {
      const newValue = this._value;
      // Still need to calculate diff here for batch scenario
      const changedKeys = Object.keys(newValue).filter(
          k => !Object.is(newValue[k as keyof T], oldValue[k as keyof T])
      ) as (keyof T)[];
      if (changedKeys.length > 0) {
          emitKeys(this, changedKeys, newValue);
      }
    }
  };
  //   const oldValue = ??? // Need a way to get oldValue for batch
  //   originalNotifyBatch.call(this);
  //   const newValue = this._value;
  //   const changedKeys = Object.keys(newValue).filter(
  //       k => !Object.is(newValue[k as keyof T], oldValue?.[k as keyof T]) // oldValue issue here
  //   ) as (keyof T)[];
  //   if (changedKeys.length > 0) {
  //       emitKeys(this, changedKeys, newValue);
  //   }
  // }


  return enhancedAtom;
}
