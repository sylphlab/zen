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

  // Override setKey: Calculate new value and call the overridden set method
  enhancedAtom.setKey = function <K extends keyof T>(key: K, value: T[K], forceNotify: boolean = false): void {
      const current = this._value;
      // Simple check for top-level key change
      if (forceNotify || !Object.is(current[key], value)) {
          const newValue = { ...current, [key]: value };
          // Call the overridden set method, which handles batching, onSet, _notify, onNotify, and emitKeys via _notifyBatch
          this.set(newValue, forceNotify);
      }
  };

  // Override the base 'set' method to handle key emission for full object updates
  const originalSet = enhancedAtom.set; // Keep reference to original prototype set
  enhancedAtom.set = function (newValue: T, forceNotify: boolean = false): void {
    const oldValue = this._value;
    if (forceNotify || !Object.is(newValue, oldValue)) {
        // Call original set logic (handles batching, onSet, _notify, onNotify)
        originalSet.call(this, newValue, forceNotify);

        // After original set logic (which includes _notify), emit key changes if not batching
        if (batchDepth === 0) {
            const changedKeys = Object.keys(newValue).filter(
                k => !Object.is(newValue[k as keyof T], oldValue?.[k as keyof T])
            ) as (keyof T)[];
            if (changedKeys.length > 0) {
                emitKeys(this, changedKeys, newValue);
            }
        }
        // TODO: Handle key emission correctly during batching (maybe in _notifyBatch override?)
    }
  };

  // Implement listenKeys
  enhancedAtom.listenKeys = function <K extends keyof T>(keys: K[], listener: KeyListener<T, K>): Unsubscribe {
    // Delegate to the base listenKeys function from events.ts
    return baseListenKeys(this, keys, listener);
  };

  // Override _notifyBatch to handle emitKeys correctly after batch completes
  const originalNotifyBatch = enhancedAtom._notifyBatch;
  enhancedAtom._notifyBatch = function() {
    const oldValue = this._oldValueBeforeBatch; // Get stored old value
    // Call original batch notify (handles listeners and clears _oldValueBeforeBatch)
    originalNotifyBatch.call(this);
    // Now oldValue is defined (if a change occurred in the batch) and _oldValueBeforeBatch is cleared

    // If oldValue exists (meaning a change happened), calculate and emit changed keys
    if (oldValue !== undefined) {
      const newValue = this._value;
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
