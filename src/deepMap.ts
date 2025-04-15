import { Atom, Listener } from './core' // Listener is in core
import { atom } from './atom' // Unsubscribe is not explicitly exported, it's the return type of subscribe

// Helper type for deep paths (e.g., 'user.profile.name' or ['user', 'profile', 'name'])
type Path = string | (string | number)[]

// Helper function to get a value deeply from an object
// Source: Modified from https://youmightnotneed.com/lodash#get
const getDeep = (obj: any, path: Path, defaultValue: any = undefined): any => {
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce(
        (res, key) => (res !== null && res !== undefined ? res[key] : res),
        obj
      )
  const result = travel(/[,[\]]+?/) || travel(/[\. ]+?/)
  return result === undefined || result === obj ? defaultValue : result
}

// Helper function to set a value deeply into an object (creates paths if they don't exist)
// Ensures immutability by cloning only when necessary.
const setDeep = (obj: any, pathInput: Path, value: any): any => {
  const path = (
    Array.isArray(pathInput)
      ? pathInput
      : String(pathInput).match(/[^.[\]]+/g)
  )?.map(String) ?? [];

  if (path.length === 0) {
    return obj; // Noop for empty path
  }

  // Revised recursive helper
  const recurse = (currentLevel: any, remainingPath: string[]): any => {
    const key = remainingPath[0] as string;

    // Determine if structure needs creation *before* checking base case
    let currentIsObject = typeof currentLevel === 'object' && currentLevel !== null;
    let nextLevelExists = currentIsObject && key in currentLevel;

    // Base case: last key
    if (remainingPath.length === 1) {
      // If structure doesn't exist or value is different, create/update
      if (!currentIsObject || !nextLevelExists || !Object.is(currentLevel[key], value)) {
         // Need to change, clone current level first
         const currentClone = currentIsObject ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...currentLevel }) : (/^\d+$/.test(key) ? [] : {});
         currentClone[key] = value;
         return currentClone;
      } else {
         // No change needed
         return currentLevel;
      }
    }

    // Recursive step: Get or determine the next level structure
    const nextLevel = currentIsObject ? currentLevel[key] : undefined;
    const updatedNextLevel = recurse(nextLevel, remainingPath.slice(1));

    // If recursion returned the exact same reference, no change happened deeper
    if (updatedNextLevel === nextLevel) {
      return currentLevel; // Return original level, no need to clone here
    }

    // Change happened deeper, clone current level and attach updated branch
    // Ensure current level is object/array before cloning
     const currentClone = currentIsObject ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...currentLevel }) : (/^\d+$/.test(key) ? [] : {}); // Create if primitive
    currentClone[key] = updatedNextLevel;
    return currentClone;
  };

  return recurse(obj, path);
}

export interface DeepMap<T extends object> extends Atom<T> {
  /**
   * Change a value for a specific deep key.
   *
   * ```js
   * profile.setKey('user.name', 'New Name')
   * profile.setKey(['user', 'address', 'city'], 'New City')
   * ```
   *
   * @param key The key path (string or array).
   * @param value New value for this key.
   */
  setKey: (key: Path, value: any) => void
}

/**
 * Create a store for managing deep objects.
 * Allows setting and potentially subscribing to changes at specific deep paths.
 *
 * @param initialValue Initial object value.
 * @returns A deep map store.
 */
export function deepMap<T extends object>(initialValue: T): DeepMap<T> {
  const store = atom(initialValue) // atom likely takes only initialValue
  const listeners: Map<Path, Set<Listener<any>>> = new Map() // For key-specific listeners (future?)

  const setKey = (key: Path, value: any): void => {
    const current = store.get()
    const newValue = setDeep(current, key, value)
    // Only update if the deep set resulted in a change to avoid unnecessary notifications
    // Note: This simple check might miss some edge cases with object references
    // A deep equality check would be more robust but costly.
    // For now, rely on setDeep creating new objects for changes.
    if (newValue !== current) { // Basic check
      store.set(newValue)
      // Notify key-specific listeners (future)
      // notifyKeyListeners(key, getDeep(newValue, key));
    }
  }

  // Directly add setKey to the created atom instance
  // This preserves the prototype chain and methods like get, subscribe, etc.
  const deepMapStore = store as DeepMap<T> // Cast to include setKey type
  deepMapStore.setKey = setKey

  // TODO: Implement subscribeKey if needed and add it similarly
  // deepMapStore.subscribeKey = (key: Path, listener: Listener<any>): Unsubscribe => { ... }

  return deepMapStore
}
