import { Atom, Listener, Unsubscribe, Path, Keys, KeyListener } from './core' // Add Keys, KeyListener
import { atom } from './atom'
// Import simplified key subscription functions
import { subscribeKeys as subscribeKeysFn, listenKeys as listenKeysFn } from './keys';

// Import helpers from the internal file
import { getDeep, setDeep } from './deepMapInternal';
// Re-export getDeep if it needs to be public API, otherwise keep it internal. Let's keep it internal for now.
// export { getDeep };

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
  const store = atom(initialValue); // Doesn't copy initial value unlike map
  const deepMapStore = store as DeepMap<T>;

  deepMapStore.setKey = (key: Path, value: any): void => {
    const current = store.get();
    const newValue = setDeep(current, key, value);
    if (newValue !== current) {
      store.set(newValue);
      // TODO: Enhance _notify to pass changed key info for fine-grained key listeners
    }
  };

  // Add key subscription methods (using simplified functions for now)
  deepMapStore.subscribeKeys = function (keys: Keys, listener: Listener<T>): Unsubscribe {
      return subscribeKeysFn(this, keys, listener);
  };

  deepMapStore.listenKeys = function (keys: Keys, listener: Listener<T>): Unsubscribe {
      return listenKeysFn(this, keys, listener);
  };

  return deepMapStore;
}

// Create a separate internal file for helpers to avoid circular dependencies if keys.ts needs them
// Create deepMapInternal.ts
/*
import { Path } from './core';

export const getDeep = (obj: any, path: Path, defaultValue: any = undefined): any => {
  if (path === null || path === undefined) return defaultValue;
  const processedPath = typeof path === 'string' ? path : Array.isArray(path) ? path : String(path);
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(processedPath, regexp)
      .filter(Boolean)
      .reduce(
        (res: any, key: string | number) => (res !== null && res !== undefined ? res[key] : res),
        obj
      );
  const result = travel(/[\. ]+?/) ?? travel(/[,[\]]+?/);
  return result === undefined || result === obj ? defaultValue : result;
}

export const setDeep = (obj: any, pathInput: Path, value: any): any => {
  const path = (
    Array.isArray(pathInput)
      ? pathInput
      : String(pathInput).match(/[^.[\]]+/g)
  )?.map(String) ?? [];

  if (path.length === 0) {
    return obj;
  }

  const recurse = (currentLevel: any, remainingPath: string[]): any => {
    const key = remainingPath[0] as string;
    let currentIsObject = typeof currentLevel === 'object' && currentLevel !== null;
    let nextLevelExists = currentIsObject && key in currentLevel;

    if (remainingPath.length === 1) {
      if (!currentIsObject || !nextLevelExists || !Object.is(currentLevel[key], value)) {
         const currentClone = currentIsObject ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...currentLevel }) : (/^\d+$/.test(key) ? [] : {});
         currentClone[key] = value;
         return currentClone;
      } else {
         return currentLevel;
      }
    }

    const nextLevel = currentIsObject ? currentLevel[key] : undefined;
    const updatedNextLevel = recurse(nextLevel, remainingPath.slice(1));

    if (updatedNextLevel === nextLevel) {
      return currentLevel;
    }

    const currentClone = currentIsObject ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...currentLevel }) : (/^\d+$/.test(key) ? [] : {});
    currentClone[key] = updatedNextLevel;
    return currentClone;
  };

  return recurse(obj, path);
}
*/
