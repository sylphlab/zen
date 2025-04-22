import { type PathListener, _emitPathChanges, listenPaths as addPathListener } from './events'; // Path listener logic from parent
// Functional DeepMap zen implementation.
import type { AnyZen, DeepMapZen, Listener, Unsubscribe } from './types'; // Combine types, Add AnyZen
import { get as getCoreValue, subscribe as subscribeToCoreZen } from './zen'; // Core get/subscribe
import type { Zen } from './zen'; // Import Zen type for casting
import { batchDepth, notifyListeners, queueZenForBatch } from './zen'; // Import batch helpers and notifyListeners from zen.ts
// Removed import { notifyListeners } from './zen'; // Import notifyListeners from zen.ts
// Removed import { getChangedPaths } from './deepMapInternal'; // Deep object utilities from parent

// --- Simple Deep Clone Helper ---
// Basic deep clone, handles plain objects and arrays. Doesn't handle Dates, Regexps, Maps, Sets etc.
const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepClone) as T;
  }
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

// --- Path Types (from HEAD's embedded deepMapInternal.ts) ---
export type PathString = string;
export type PathArray = (string | number)[];
/** Represents a path within a nested object, either as a dot-separated string or an array of keys/indices. */
export type Path = PathString | PathArray;

// --- setDeep Helpers ---

/** Clones a node (object or array) shallowly. @internal */
const _cloneNode = (node: unknown, isArrayIndexHint: boolean): object | unknown[] => {
  if (typeof node === 'object' && node !== null) {
    return Array.isArray(node) ? [...node] : { ...(node as object) };
  }
  // If not an object/array, create new based on hint
  return isArrayIndexHint ? [] : {};
};

/** Handles updating the leaf node during setDeep recursion. @internal */
const _updateLeafNode = (
  currentLevel: unknown,
  key: string | number,
  value: unknown,
): unknown => {
  const currentIsObject = typeof currentLevel === 'object' && currentLevel !== null;
  const currentLevelObj = currentLevel as Record<string | number, unknown>;

  // Check if update is needed (not object, key missing, or value different)
  if (
    !currentIsObject ||
    !(key in currentLevelObj) ||
    !Object.is(currentLevelObj[key], value)
  ) {
    const isArrayIndex = typeof key === 'number';
    const currentClone = _cloneNode(currentLevel, isArrayIndex); // Use helper

    const currentCloneAsserted = currentClone as Record<string | number, unknown>;

    // Handle array index creation beyond current length using defineProperty
    if (
      Array.isArray(currentCloneAsserted) &&
      typeof key === 'number' &&
      key >= currentCloneAsserted.length
    ) {
      Object.defineProperty(currentCloneAsserted, key, {
        value: value,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    } else {
      currentCloneAsserted[key] = value;
    }
    return currentCloneAsserted;
  }
  // If no update needed, return original level
  return currentLevel;
};

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
    : (String(path).match(/[^.[\]]+/g) || []).map((s) =>
        /^\d+$/.test(s) ? Number.parseInt(s, 10) : s,
      );

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
      return _updateLeafNode(currentLevel, key, value); // Use helper
    }

    // --- Recursive Step ---
    let nextLevel = currentIsObject
      ? (currentLevel as Record<string | number, unknown>)[key]
      : undefined;
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
    const currentClone = _cloneNode(currentLevel, isArrayIndex); // Use helper

    const currentCloneAsserted = currentClone as Record<string | number, unknown>;
    if (
      Array.isArray(currentCloneAsserted) &&
      typeof key === 'number' &&
      key >= currentCloneAsserted.length
    ) {
      Object.defineProperty(currentCloneAsserted, key, {
        value: updatedNextLevel,
        writable: true,
        enumerable: true,
        configurable: true,
      });
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

/**
 * Handles base cases for the deep comparison logic in getChangedPaths.
 * Returns true if a base case was met (difference found or identical), false otherwise.
 * @internal
 */
function _handleCompareBaseCases(
  a: unknown,
  b: unknown,
  currentPath: PathArray,
  paths: PathArray[], // Mutated
  visited: Set<unknown>, // Mutated
): boolean {
  // 1. Identical values (Object.is)? Stop comparison for this branch.
  if (Object.is(a, b)) {
    return true; // Base case met: identical
  }

  // Handle cycles
  if (
    (typeof a === 'object' && a !== null && visited.has(a)) ||
    (typeof b === 'object' && b !== null && visited.has(b))
  ) {
    return true; // Base case met: cycle detected
  }

  // 2. One is null/undefined, the other is not? Path changed.
  const aIsNullOrUndefined = a === null || a === undefined;
  const bIsNullOrUndefined = b === null || b === undefined;
  if (aIsNullOrUndefined !== bIsNullOrUndefined) {
    paths.push([...currentPath]);
    return true; // Base case met: difference found
  }
  // If both are null/undefined, Object.is would have caught it.

  // 3. Different types (primitive vs object, array vs object)? Path changed.
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    paths.push([...currentPath]);
    return true; // Base case met: difference found
  }

  // 4. Both are primitives or functions (and not identical per Object.is)? Path changed.
  if (typeof a !== 'object' || a === null) {
    // a === null check handles null case
    paths.push([...currentPath]);
    return true; // Base case met: difference found
  }

  // None of the base cases met
  return false;
}

/** @internal Compares keys from object 'a' against 'b'. */
function _compareKeysFromA(
  a: object,
  b: object,
  currentPath: PathArray,
  paths: PathArray[], // Mutated
  processedKeys: Set<string | number>, // Mutated
  compareFn: (x: unknown, y: unknown, p: PathArray) => void, // Recursive call
): void {
  const objAAsserted = a as Record<string | number, unknown>;
  const objBAsserted = b as Record<string | number, unknown>;
  const keysA = Object.keys(objAAsserted);

  for (const key of keysA) {
    processedKeys.add(key);
    const pathSegment = Array.isArray(a) ? Number.parseInt(key, 10) : key;
    const newPath = [...currentPath, pathSegment];
    const valA = objAAsserted[key];
    const valB = objBAsserted[key]; // Access potentially undefined value

    // Check if key exists in B and if values differ
    if (!(key in objBAsserted) || !Object.is(valA, valB)) {
      // If both values are nested objects/arrays, recurse.
      if (
        typeof valA === 'object' &&
        valA !== null &&
        typeof valB === 'object' &&
        valB !== null
      ) {
        compareFn(valA, valB, newPath); // Use passed compare function
      } else {
        // Otherwise, the difference is at this path (value diff or key only in A).
        paths.push(newPath);
      }
    }
  }
}

/** @internal Finds keys present in 'b' but not in 'a'. */
function _findKeysOnlyInB(
  b: object,
  currentPath: PathArray,
  paths: PathArray[], // Mutated
  processedKeys: Set<string | number>,
): void {
  const objBAsserted = b as Record<string | number, unknown>;
  const keysB = Object.keys(objBAsserted);
  for (const key of keysB) {
    if (!processedKeys.has(key)) {
      // Key only exists in B, difference found.
      const pathSegment = Array.isArray(b) ? Number.parseInt(key, 10) : key; // Use 'b' for array check
      paths.push([...currentPath, pathSegment]);
    }
  }
}


/**
 * Handles comparison of objects or arrays in getChangedPaths.
 * @internal
 */
function _compareObjectsOrArrays(
  a: object, // Known to be object/array here
  b: object, // Known to be object/array here
  currentPath: PathArray,
  paths: PathArray[], // Mutated
  visited: Set<unknown>, // Mutated
  compareFn: (x: unknown, y: unknown, p: PathArray) => void, // Recursive call
): void {
  // Add to visited set before recursing
  visited.add(a);
  visited.add(b);

  // Compare keys from A against B
  const processedKeys = new Set<string | number>();
  _compareKeysFromA(a, b, currentPath, paths, processedKeys, compareFn);

  // Find keys only in B
  _findKeysOnlyInB(b, currentPath, paths, processedKeys);
  // Remove from visited after processing children (for non-tree structures)
  // visited.delete(a); // Optional: depends if graph structures are expected
  // visited.delete(b);
}

function compare(a: unknown, b: unknown, currentPath: PathArray = []) {
  // Handle base cases first
  if (_handleCompareBaseCases(a, b, currentPath, paths, visited)) {
    return; // Base case handled (difference found or identical/cycle)
  }

  // If base cases didn't handle it, we know both a and b are non-null objects/arrays
  // and are not identical references or part of a cycle already visited at this level.
  _compareObjectsOrArrays(
    a as object, // Safe cast after base case checks
    b as object, // Safe cast after base case checks
    currentPath,
    paths,
    visited,
    compare, // Pass self for recursion
  );
}

  compare(objA, objB); // Call the new top-level compare function
  return paths;
};

// --- Functional API for DeepMap ---

/**
 * Creates a DeepMap Zen (functional style).
 * @template T The type of the object state.
 * @param initialValue The initial object state. It's used directly.
 * @returns A DeepMapZen instance.
 */
export function deepMap<T extends object>(initialValue: T): DeepMapZen<T> {
  const deepMapZen: DeepMapZen<T> = {
    _kind: 'deepMap',
    _value: initialValue,
    // Listener properties are initially undefined
  };
  // Add internal properties for events if they exist in the type definition
  // (Assuming DeepMapZen might have _setListeners, _pathListeners etc. after type updates)
  // deepMapZen._setListeners = undefined;
  // deepMapZen._pathListeners = undefined;
  return deepMapZen;
}

// Re-export core get/subscribe for compatibility
export { getCoreValue as get, subscribeToCoreZen as subscribe };

/**
 * Sets a value at a specific path within the DeepMap Zen, creating a new object immutably.
 * Notifies both map-level and relevant path-specific listeners. (Restored logic)
 */
export function setPath<T extends object>(
  deepMapZen: DeepMapZen<T>,
  path: Path,
  value: unknown,
  forceNotify = false,
): void {
  if (!path || (Array.isArray(path) && path.length === 0) || path === '') {
    return;
  }

  const currentValue = deepMapZen._value;
  const nextValue = setDeep(currentValue, path, value);

  if (forceNotify || nextValue !== currentValue) {
    // Call onSet listeners if applicable (outside batch)
    _handleDeepMapOnSet(deepMapZen, nextValue as T);

    // Update the internal value
    deepMapZen._value = nextValue as T;

    // Handle batching or immediate notification
    _handleDeepMapNotification(deepMapZen, currentValue, nextValue as T, path);
  }
}

/** @internal */
function _handleDeepMapSetUpdateAndNotify<T extends object>(
  deepMapZen: DeepMapZen<T>,
  oldValue: T,
  nextValue: T, // The potentially cloned value
  changedPaths: PathArray[],
  forceNotify: boolean,
): void {
  // Only proceed if content actually changed or forced
  if (changedPaths.length > 0 || forceNotify) {
    // Emit path changes *before* setting value
    if (changedPaths.length > 0) {
      _emitPathChanges(deepMapZen, changedPaths, nextValue);
    }

    // Use deep clone for immutability before assigning
    const finalValue = deepClone(nextValue);
    deepMapZen._value = finalValue; // Assign the cloned value

    // Handle batching or immediate notification
    if (batchDepth > 0) {
      queueZenForBatch(deepMapZen as Zen<T>, oldValue);
    } else {
      // Notify general listeners with the final cloned value
      notifyListeners(deepMapZen as AnyZen, finalValue, oldValue);
    }
  } else {
    // If only reference changed but content is identical (and not forceNotify),
    // still update the internal reference to the new object, but don't notify.
    // Use deep clone here too for consistency.
    deepMapZen._value = deepClone(nextValue);
  }
}

/** @internal Handles onSet calls for deepMap set/setPath */
function _handleDeepMapOnSet<T extends object>(
  deepMapZen: DeepMapZen<T>,
  nextValue: T,
): void {
  if (batchDepth <= 0) {
    const setLs = deepMapZen._setListeners as Set<Listener<T>> | undefined;
    if (setLs?.size) {
      for (const fn of setLs) {
        try {
          fn(nextValue);
        } catch (_e) {}
      }
    }
  }
}

/** @internal Handles notification/batching for deepMap setPath */
function _handleDeepMapNotification<T extends object>(
  deepMapZen: DeepMapZen<T>,
  currentValue: T,
  nextValue: T,
  path: Path,
): void {
  if (batchDepth > 0) {
    queueZenForBatch(deepMapZen as Zen<T>, currentValue);
  } else {
    _emitPathChanges(deepMapZen, [path], nextValue);
    notifyListeners(deepMapZen as AnyZen, nextValue, currentValue);
  }
}


/**
 * Sets the entire value of the DeepMap Zen, replacing the current object.
 * Notifies both map-level and relevant path-specific listeners. (Restored logic)
 */
export function set<T extends object>(
  deepMapZen: DeepMapZen<T>,
  nextValue: T,
  forceNotify = false,
): void {
  const oldValue = deepMapZen._value;

  if (forceNotify || !Object.is(nextValue, oldValue)) {
    // Restore changed paths calculation from parent
    const changedPaths = getChangedPaths(oldValue, nextValue);

    // Call onSet listeners if applicable (outside batch)
    _handleDeepMapOnSet(deepMapZen, nextValue);

    // Handle update, cloning, path emission, and notifications
    _handleDeepMapSetUpdateAndNotify(
      deepMapZen,
      oldValue,
      nextValue, // Pass original nextValue, cloning happens inside helper
      changedPaths,
      forceNotify,
    );
  }
}

/** Listens to changes for specific paths within a DeepMap Zen. (Restored) */
export function listenPaths<T extends object>(
  deepMapZen: DeepMapZen<T>,
  paths: Path[],
  listener: PathListener<T>,
): Unsubscribe {
  // Delegates to the function from events.ts
  // Assuming addPathListener exists and works with DeepMapZen
  return addPathListener(deepMapZen, paths, listener);
}

// Note: Factory function is now 'deepMap', path setter is 'setPath', etc.
