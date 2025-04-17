// Functional DeepMap atom implementation.
import type { Unsubscribe, DeepMapAtom, Listener, AnyAtom } from './types'; // Combine types, Add AnyAtom
import { get as getCoreValue, subscribe as subscribeToCoreAtom } from './atom'; // Core get/subscribe
import type { Atom } from './atom'; // Import Atom type for casting
import { listenPaths as addPathListener, _emitPathChanges, PathListener } from './events'; // Path listener logic from parent
import { batchDepth, queueAtomForBatch, notifyListeners } from './atom'; // Import batch helpers and notifyListeners from atom.ts
// Removed import { notifyListeners } from './atom'; // Import notifyListeners from atom.ts
// Removed import { getChangedPaths } from './deepMapInternal'; // Deep object utilities from parent

// --- Path Types (from HEAD's embedded deepMapInternal.ts) ---
export type PathString = string;
export type PathArray = (string | number)[];
/** Represents a path within a nested object, either as a dot-separated string or an array of keys/indices. */
export type Path = PathString | PathArray;


// --- setDeep Helper (from HEAD's embedded deepMapInternal.ts) ---
/**
 * Sets a value within a nested object immutably based on a path.
 * Creates shallow copies of objects/arrays along the path only if necessary.
 * Returns the original object if the value at the path is already the same.
 * @internal
 */
const setDeep = (obj: unknown, path: Path, value: unknown): unknown => {
  // 1. Normalize path to an array of keys/indices.
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
    if (key === undefined) return currentLevel;

    const currentIsObject = typeof currentLevel === 'object' && currentLevel !== null;
    const isLastKey = remainingPath.length === 1;

    // --- Leaf Node Update ---
    if (isLastKey) {
      const currentLevelObj = currentLevel as Record<string | number, unknown>;
      if (!currentIsObject || !(key in currentLevelObj) || !Object.is(currentLevelObj[key], value)) {
        const isArrayIndex = typeof key === 'number';
        const currentClone = currentIsObject
          ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...(currentLevel as object) })
          : (isArrayIndex ? [] : {});

        const currentCloneAsserted = currentClone as Record<string | number, unknown>;
        if (Array.isArray(currentCloneAsserted) && typeof key === 'number' && key >= currentCloneAsserted.length) {
           Object.defineProperty(currentCloneAsserted, key, { value: value, writable: true, enumerable: true, configurable: true });
        } else {
           currentCloneAsserted[key] = value;
        }
        return currentCloneAsserted;
      } else {
        return currentLevel;
      }
    }

    // --- Recursive Step ---
    let nextLevel = currentIsObject ? (currentLevel as Record<string | number, unknown>)[key] : undefined;
    const nextKey = remainingPath[1];
    const nextLevelShouldBeArray = nextKey !== undefined && /^\d+$/.test(String(nextKey));

    if (nextLevel === undefined || nextLevel === null) {
      nextLevel = nextLevelShouldBeArray ? [] : {};
    }

    const updatedNextLevel = recurse(nextLevel, remainingPath.slice(1));

    if (updatedNextLevel === nextLevel) {
      return currentLevel;
    }

    const isArrayIndex = typeof key === 'number';
    const currentClone = currentIsObject
      ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...(currentLevel as object) })
      : (isArrayIndex ? [] : {});

     const currentCloneAsserted = currentClone as Record<string | number, unknown>;
     if (Array.isArray(currentCloneAsserted) && typeof key === 'number' && key >= currentCloneAsserted.length) {
        Object.defineProperty(currentCloneAsserted, key, { value: updatedNextLevel, writable: true, enumerable: true, configurable: true });
     } else {
        currentCloneAsserted[key] = updatedNextLevel;
     }
    return currentCloneAsserted;
  };

  // 4. Start the recursion.
  return recurse(obj, pathArray);
};

// --- getChangedPaths Helper (from deepMapInternal.ts) ---
/**
 * Compares two objects (potentially nested) and returns an array of paths
 * where differences are found. Compares values using Object.is.
 *
 * @param objA The first object.
 * @param objB The second object.
 * @returns An array of Path arrays representing the locations of differences.
 * @internal
 */
const getChangedPaths = (objA: unknown, objB: unknown): PathArray[] => {
    const paths: PathArray[] = []; // Store results as PathArray
    const visited = new Set<unknown>(); // Track visited objects

    function compare(a: unknown, b: unknown, currentPath: PathArray = []) {
        // 1. Identical values (Object.is)? Stop comparison for this branch.
        if (Object.is(a, b)) {
            return;
        }
        // Handle cycles
        if ((typeof a === 'object' && a !== null && visited.has(a)) || (typeof b === 'object' && b !== null && visited.has(b))) {
            return;
        }

        // 2. One is null/undefined, the other is not? Path changed.
        const aIsNullOrUndefined = a === null || a === undefined;
        const bIsNullOrUndefined = b === null || b === undefined;
        if (aIsNullOrUndefined !== bIsNullOrUndefined) {
             paths.push([...currentPath]);
             return;
        }
        // If both are null/undefined, Object.is would have caught it.

        // 3. Different types (primitive vs object, array vs object)? Path changed.
        if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
            paths.push([...currentPath]);
            return;
        }

        // 4. Both are primitives or functions (and not identical per Object.is)? Path changed.
        if (typeof a !== 'object' || a === null) { // a === null check handles null case
            paths.push([...currentPath]);
            return;
        }

        // 5. Both are objects or arrays. Compare their contents.
        // Add to visited set before recursing
        visited.add(a);
        visited.add(b);

        // Assert types for key access
        const objAAsserted = a as Record<string | number, unknown>;
        const objBAsserted = b as Record<string | number, unknown>;

        // Optimized key comparison: Iterate A, then check B for keys not in A.
        const keysA = Object.keys(objAAsserted);
        const processedKeys = new Set<string | number>(); // Track keys from A

        for (const key of keysA) {
            processedKeys.add(key);
            const pathSegment = Array.isArray(a) ? parseInt(key, 10) : key;
            const newPath = [...currentPath, pathSegment];
            const valA = objAAsserted[key];
            const valB = objBAsserted[key]; // Access potentially undefined value

            // Check if key exists in B and if values differ
            if (!(key in objBAsserted) || !Object.is(valA, valB)) {
                // If both values are nested objects/arrays, recurse.
                if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
                    compare(valA, valB, newPath);
                } else {
                    // Otherwise, the difference is at this path (value diff or key only in A).
                    paths.push(newPath);
                }
            }
        }

        // Check for keys present in B but not in A
        const keysB = Object.keys(objBAsserted);
        for (const key of keysB) {
            if (!processedKeys.has(key)) {
                // Key only exists in B, difference found.
                const pathSegment = Array.isArray(b) ? parseInt(key, 10) : key; // Use 'b' for array check
                paths.push([...currentPath, pathSegment]);
            }
        }
        // Remove from visited after processing children (for non-tree structures)
        // visited.delete(a); // Optional: depends if graph structures are expected
        // visited.delete(b);
    }

    compare(objA, objB);
    return paths;
};

// --- Functional API for DeepMap ---

/**
 * Creates a DeepMap Atom (functional style).
 * @template T The type of the object state.
 * @param initialValue The initial object state. It's used directly.
 * @returns A DeepMapAtom instance.
 */
export function deepMap<T extends object>(initialValue: T): DeepMapAtom<T> {
  const deepMapAtom: DeepMapAtom<T> = {
    _kind: 'deepMap',
    _value: initialValue,
    // Listener properties are initially undefined
  };
  // Add internal properties for events if they exist in the type definition
  // (Assuming DeepMapAtom might have _setListeners, _pathListeners etc. after type updates)
  // deepMapAtom._setListeners = undefined;
  // deepMapAtom._pathListeners = undefined;
  return deepMapAtom;
}

// Re-export core get/subscribe for compatibility
export { getCoreValue as get, subscribeToCoreAtom as subscribe };

/**
 * Sets a value at a specific path within the DeepMap Atom, creating a new object immutably.
 * Notifies both map-level and relevant path-specific listeners. (Restored logic)
 */
export function setPath<T extends object>(
  deepMapAtom: DeepMapAtom<T>,
  path: Path,
  value: unknown,
  forceNotify = false
): void {
  if (!path || (Array.isArray(path) && path.length === 0) || path === '') {
      console.warn('setPath called with an empty path. Operation ignored.');
      return;
  }

  const currentValue = deepMapAtom._value;
  const nextValue = setDeep(currentValue, path, value);

  if (forceNotify || nextValue !== currentValue) {
    // Restore onSet logic from parent
    if (batchDepth <= 0) {
        // Access _setListeners directly (assuming it's defined in DeepMapAtom via AtomWithValue)
        const setLs = deepMapAtom._setListeners as Set<Listener<T>> | undefined; // Keep cast for Listener<T>
        if (setLs?.size) {
            for (const fn of setLs) {
                try { fn(nextValue as T); } catch(e) { console.error(`Error in onSet listener for deepMap path set ${String(deepMapAtom)}:`, e); }
            }
        }
    }

    deepMapAtom._value = nextValue as T;

    // Restore batching and notification logic from parent
    if (batchDepth > 0) {
        // Cast needed as queueAtomForBatch expects Atom<T>
        queueAtomForBatch(deepMapAtom as Atom<T>, currentValue);
    } else {
        // Emit path changes first
        // Assuming _emitPathChanges exists and works with DeepMapAtom
        _emitPathChanges(deepMapAtom, [path], nextValue as T);
        // Notify general listeners, cast deepMapAtom to AnyAtom.
        notifyListeners(deepMapAtom as AnyAtom, nextValue as T, currentValue);
    }
  }
}

/**
 * Sets the entire value of the DeepMap Atom, replacing the current object.
 * Notifies both map-level and relevant path-specific listeners. (Restored logic)
 */
export function set<T extends object>(
  deepMapAtom: DeepMapAtom<T>,
  nextValue: T,
  forceNotify = false
): void {
  const oldValue = deepMapAtom._value;

  if (forceNotify || !Object.is(nextValue, oldValue)) {
    // Restore changed paths calculation from parent
    const changedPaths = getChangedPaths(oldValue, nextValue);

    // Restore onSet logic from parent
    if (batchDepth <= 0) {
        // Access _setListeners directly
        const setLs = deepMapAtom._setListeners as Set<Listener<T>> | undefined; // Keep cast for Listener<T>
        if (setLs?.size) {
            for (const fn of setLs) {
                try { fn(nextValue); } catch(e) { console.error(`Error in onSet listener for deepMap set ${String(deepMapAtom)}:`, e); }
            }
        }
    }

    // Emit path changes *before* setting value (Restored from parent)
    if (changedPaths.length > 0) {
        // Assuming _emitPathChanges exists and works with DeepMapAtom
        _emitPathChanges(deepMapAtom, changedPaths, nextValue);
    }

    deepMapAtom._value = nextValue;

    // Restore batching and notification logic from parent (notifyListeners is called last)
    if (batchDepth > 0) {
        // Cast needed as queueAtomForBatch expects Atom<T>
        queueAtomForBatch(deepMapAtom as Atom<T>, oldValue);
    } else {
        // General listeners notified after path changes and value set, cast deepMapAtom to AnyAtom.
        notifyListeners(deepMapAtom as AnyAtom, nextValue, oldValue);
    }
  }
}

/** Listens to changes for specific paths within a DeepMap Atom. (Restored) */
export function listenPaths<T extends object>(
    deepMapAtom: DeepMapAtom<T>,
    paths: Path[],
    listener: PathListener<T>
): Unsubscribe {
    // Delegates to the function from events.ts
    // Assuming addPathListener exists and works with DeepMapAtom
    return addPathListener(deepMapAtom, paths, listener);
}

// Note: Factory function is now 'deepMap', path setter is 'setPath', etc.
