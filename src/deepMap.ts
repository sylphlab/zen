// Minimal DeepMap Helper (Post-Optimization)

import { Atom, Listener, Unsubscribe } from './core'; // Removed Path, Keys, KeyListener
import { atom } from './atom';
// REMOVED: import { subscribeKeys as subscribeKeysFn, listenKeys as listenKeysFn, normalizePath } from './keys';

// Import helpers and Path type from the internal file
import { getDeep, setDeep, Path } from './deepMapInternal'; // Add Path import here

// Minimal DeepMap Interface
export interface DeepMap<T extends object> extends Atom<T> {
  setKey: (key: Path, value: any, forceNotify?: boolean) => void; // Added optional forceNotify
  // REMOVED: Key Subscriptions
  // subscribeKeys(keys: Keys, listener: Listener<T>): Unsubscribe;
  // listenKeys(keys: Keys, listener: Listener<T>): Unsubscribe;
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

  deepMapStore.setKey = (key: Path, value: any, forceNotify: boolean = false): void => {
    const current = store.get();
    const newValue = setDeep(current, key, value);
    // Use simplified set if value changed
    if (forceNotify || newValue !== current) {
       // REMOVED: normalizePath call
       // Use the simplified set method - no payload/changedPath
       store.set(newValue, forceNotify);
    }
  };

  // REMOVED: Key subscription methods
  // deepMapStore.subscribeKeys = ...
  // deepMapStore.listenKeys = ...
  // REMOVED extra closing brace here

  return deepMapStore;
}
