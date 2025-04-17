// Functional DeepMap atom implementation.
import type { DeepMapAtom } from './types'; // Remove unused Unsubscribe, AnyAtom, AtomWithValue
import { get as getCoreValue, subscribe as subscribeToCoreAtom, notifyListeners } from './atom'; // Import core get/subscribe AND notifyListeners
// import type { Atom } from './atom'; // Removed unused import
// Removed imports for listenPaths, _emitPathChanges, PathListener from './events'
// Removed batch imports
// Removed import from internalUtils
// Removed import { Path, setDeep } from './deepMapInternal'; // Removed conflicting import

// --- Path Types (from deepMapInternal.ts) ---
export type PathString = string;
export type PathArray = (string | number)[];
/** Represents a path within a nested object, either as a dot-separated string or an array of keys/indices. */
export type Path = PathString | PathArray;


// --- setDeep Helper (from deepMapInternal.ts) ---

/**
 * Sets a value within a nested object immutably based on a path.
 * Creates shallow copies of objects/arrays along the path only if necessary.
 * Returns the original object if the value at the path is already the same.
 *
 * @param obj The original object.
 * @param path The path (string or array) where the value should be set.
 * @param value The value to set.
 * @returns A new object with the value set, or the original object if no change was needed.
 * @internal
 */
const setDeep = (obj: unknown, path: Path, value: unknown): unknown => {
  // 1. Normalize path to an array of keys/indices.
  // Handles dot notation strings and array indices within strings.
  const pathArray: PathArray = Array.isArray(path)
    ? path
    : (String(path).match(/[^.[\]]+/g) || []).map(s => /^\d+$/.test(s) ? parseInt(s, 10) : s);

  // 2. Handle empty path: return original object (no-op).
  if (pathArray.length === 0) {
    return obj;
  }

  // 3. Recursive helper function to traverse and update.
  const recurse = (currentLevel: unknown, remainingPath: PathArray): unknown => {
    const key = remainingPath[0];
    // Base case should be handled by length check, but defensive check for TS.
    if (key === undefined) return currentLevel;

    const currentIsObject = typeof currentLevel === 'object' && currentLevel !== null;
    const isLastKey = remainingPath.length === 1;

    // --- Leaf Node Update ---
    if (isLastKey) {
      // Check if update is needed: not an object, key missing, or value differs.
      // Use type assertion for key check and value access
      const currentLevelObj = currentLevel as Record<string | number, unknown>;
      if (!currentIsObject || !(key in currentLevelObj) || !Object.is(currentLevelObj[key], value)) {
        // Determine if the clone should be an array or object based on the *current* key.
        const isArrayIndex = typeof key === 'number'; // More direct check
        // Clone current level or create new container if currentLevel is not an object/array.
        const currentClone = currentIsObject
          ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...(currentLevel as object) }) // Assert for spread
          : (isArrayIndex ? [] : {});

        // Ensure array is large enough if setting by index beyond current length.
        // Assert currentClone type for array check and indexing
        const currentCloneAsserted = currentClone as Record<string | number, unknown>;
        if (Array.isArray(currentCloneAsserted) && typeof key === 'number' && key >= currentCloneAsserted.length) {
          // Fill sparse arrays with undefined up to the target index.
           Object.defineProperty(currentCloneAsserted, key, { value: value, writable: true, enumerable: true, configurable: true });
           // Direct assignment might be sufficient if length adjusts automatically, but defineProperty is safer for sparse arrays.
           // currentCloneAsserted[key] = value; // Alternative
        } else {
           currentCloneAsserted[key] = value;
        }
        return currentCloneAsserted; // Return the modified clone
      } else {
        return currentLevel; // No change needed at this leaf, return original level.
      }
    }

    // --- Recursive Step ---
    // Get the next level object/array. Use assertion for indexing
    let nextLevel = currentIsObject ? (currentLevel as Record<string | number, unknown>)[key] : undefined;
    const nextKey = remainingPath[1]; // Look ahead to determine needed type
    const nextLevelShouldBeArray = nextKey !== undefined && /^\d+$/.test(String(nextKey));

    // If the next level doesn't exist or is null, create an empty container of the correct type.
    if (nextLevel === undefined || nextLevel === null) {
      nextLevel = nextLevelShouldBeArray ? [] : {};
    }

    // Recursively update the next level.
    const updatedNextLevel = recurse(nextLevel, remainingPath.slice(1));

    // If the recursive call returned the *same* object (no changes deeper down),
    // then no change is needed at the current level either.
    if (updatedNextLevel === nextLevel) {
      return currentLevel;
    }

    // Otherwise, changes occurred deeper. Clone the current level and update the key.
    const isArrayIndex = typeof key === 'number';
    // Assert currentLevel type for cloning
    const currentClone = currentIsObject
      ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...(currentLevel as object) })
      : (isArrayIndex ? [] : {}); // Create container if currentLevel wasn't object

     // Ensure array is large enough (less likely needed here than leaf, but for safety).
     // Assert currentClone type for array check and indexing
     const currentCloneAsserted = currentClone as Record<string | number, unknown>;
     if (Array.isArray(currentCloneAsserted) && typeof key === 'number' && key >= currentCloneAsserted.length) {
        Object.defineProperty(currentCloneAsserted, key, { value: updatedNextLevel, writable: true, enumerable: true, configurable: true });
     } else {
        currentCloneAsserted[key] = updatedNextLevel;
     }
    return currentCloneAsserted; // Return the modified clone
  };

  // 4. Start the recursion.
  return recurse(obj, pathArray);
};


// DeepMapAtom type is now defined in types.ts

// --- Functional API for DeepMap ---

/**
 * Creates a DeepMap Atom (functional style).
 * @template T The type of the object state.
 * @param initialValue The initial object state. It's used directly.
 * @returns A DeepMapAtom instance.
 */
export function deepMap<T extends object>(initialValue: T): DeepMapAtom<T> {
  // Create the merged DeepMapAtom object directly
  const deepMapAtom: DeepMapAtom<T> = {
    _kind: 'deepMap',
    _value: initialValue, // Use initial value directly (deep clone happens in setDeep)
    // Listener properties (_listeners, etc.) are initially undefined
  };
  return deepMapAtom;
}

// get and subscribe are now handled by the core functions in atom.ts
// Re-export core get/subscribe for compatibility
export { getCoreValue as get, subscribeToCoreAtom as subscribe };

/**
 * Sets a value at a specific path within the DeepMap Atom, creating a new object immutably.
 * Notifies map-level listeners immediately.
 */
export function setPath<T extends object>(
  deepMapAtom: DeepMapAtom<T>,
  path: Path,
  value: unknown, // Use unknown instead of any
  forceNotify = false
): void {
  // Prevent errors with empty paths.
  if (!path || (Array.isArray(path) && path.length === 0) || path === '') {
      console.warn('setPath called with an empty path. Operation ignored.'); // Updated warning
      return;
  }

  // Operate directly on deepMapAtom
  const currentValue = deepMapAtom._value;

  // Use the utility to create a new object with the value set at the path.
  const nextValue = setDeep(currentValue, path, value);

  // Only proceed if the state actually changed or if forced.
  if (forceNotify || nextValue !== currentValue) {
    // onSet logic removed

    // Assert nextValue type for assignment
    deepMapAtom._value = nextValue as T;

    // Batching logic removed, notify immediately
    // Path-specific change emission removed.
    // Notify general listeners, casting nextValue from unknown to T
    notifyListeners(deepMapAtom, nextValue as T, currentValue);
  }
}

/**
 * Sets the entire value of the DeepMap Atom, replacing the current object.
 * Notifies map-level listeners immediately.
 */
export function set<T extends object>(
  deepMapAtom: DeepMapAtom<T>,
  nextValue: T,
  forceNotify = false
): void {
  // Operate directly on deepMapAtom
  const oldValue = deepMapAtom._value;

  if (forceNotify || !Object.is(nextValue, oldValue)) {
    // Path-specific change calculation and emission removed.
    // onSet logic removed

    // Set the deepMapAtom's value directly and notify
    deepMapAtom._value = nextValue;
    notifyListeners(deepMapAtom, nextValue, oldValue);
  }
}

// listenPaths function removed.

// Note: Factory function is now 'deepMap', path setter is 'setPath', etc.
