import { Atom, Listener, Unsubscribe, Path, Keys, KeyListener } from './core'
import { atom } from './atom'
// Import key subscription functions AND normalizePath
import { subscribeKeys as subscribeKeysFn, listenKeys as listenKeysFn, normalizePath } from './keys';

// Import helpers from the internal file - Ensure this path is correct and file exports correctly
import { getDeep, setDeep } from './deepMapInternal';

export interface DeepMap<T extends object> extends Atom<T> {
  setKey: (key: Path, value: any) => void;
  // Key Subscriptions
  subscribeKeys(keys: Keys, listener: Listener<T>): Unsubscribe;
  listenKeys(keys: Keys, listener: Listener<T>): Unsubscribe;
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

  deepMapStore.setKey = (key: Path, value: any): void => {
    const current = store.get();
    const newValue = setDeep(current, key, value);
    if (newValue !== current) {
       const pathString = normalizePath(key);
       // Pass the changed path in the third argument (payload)
       store.set(newValue, false, { changedPath: pathString });
       // Note: Fine-grained notification logic will be in atom.ts _notify
    }
  };

  deepMapStore.subscribeKeys = function (keys: Keys, listener: Listener<T>): Unsubscribe {
      return subscribeKeysFn(this, keys, listener);
  };

  deepMapStore.listenKeys = function (keys: Keys, listener: Listener<T>): Unsubscribe {
      return listenKeysFn(this, keys, listener);
  };

  return deepMapStore;
}
