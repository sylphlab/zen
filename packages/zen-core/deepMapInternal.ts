// Internal utility functions for deepMap implementation.

// --- Path Types ---
export type PathString = string;
export type PathArray = (string | number)[];
/** Represents a path within a nested object, either as a dot-separated string or an array of keys/indices. */
export type Path = PathString | PathArray;

// --- Helper Functions ---

/**
 * Gets a value from a nested object based on a path array.
 * @param obj The object to traverse.
 * @param path An array representing the path (e.g., ['user', 'address', 0, 'street']).
 * @param defaultValue Value to return if the path doesn't exist.
 * @returns The value at the specified path or the default value.
 * @internal
 */
export const getDeep = (obj: any, path: PathArray, defaultValue: any = undefined): any => {
  let current = obj;
  for (const key of path) {
    // If current level is not an object or array, path doesn't exist.
    if (current === null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key]; // Move to the next level
  }
  // Return the final value or default if it's undefined at the end.
  return current === undefined ? defaultValue : current;
};

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
export const setDeep = (obj: any, path: Path, value: any): any => {
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
  const recurse = (currentLevel: any, remainingPath: PathArray): any => {
    const key = remainingPath[0];
    // Base case should be handled by length check, but defensive check for TS.
    if (key === undefined) return currentLevel;

    const currentIsObject = typeof currentLevel === 'object' && currentLevel !== null;
    const isLastKey = remainingPath.length === 1;

    // --- Leaf Node Update ---
    if (isLastKey) {
      // Check if update is needed: not an object, key missing, or value differs.
      if (!currentIsObject || !(key in currentLevel) || !Object.is(currentLevel[key], value)) {
        // Determine if the clone should be an array or object based on the *current* key.
        const isArrayIndex = typeof key === 'number'; // More direct check
        // Clone current level or create new container if currentLevel is not an object/array.
        const currentClone = currentIsObject
          ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...currentLevel })
          : (isArrayIndex ? [] : {});

        // Ensure array is large enough if setting by index beyond current length.
        if (Array.isArray(currentClone) && typeof key === 'number' && key >= currentClone.length) {
          // Fill sparse arrays with undefined up to the target index.
           Object.defineProperty(currentClone, key, { value: value, writable: true, enumerable: true, configurable: true });
           // Direct assignment might be sufficient if length adjusts automatically, but defineProperty is safer for sparse arrays.
           // currentClone[key] = value; // Alternative
        } else {
           currentClone[key] = value;
        }
        return currentClone; // Return the modified clone
      } else {
        return currentLevel; // No change needed at this leaf, return original level.
      }
    }

    // --- Recursive Step ---
    // Get the next level object/array.
    let nextLevel = currentIsObject ? currentLevel[key] : undefined;
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
    const currentClone = currentIsObject
      ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...currentLevel })
      : (isArrayIndex ? [] : {}); // Create container if currentLevel wasn't object

     // Ensure array is large enough (less likely needed here than leaf, but for safety).
     if (Array.isArray(currentClone) && typeof key === 'number' && key >= currentClone.length) {
        Object.defineProperty(currentClone, key, { value: updatedNextLevel, writable: true, enumerable: true, configurable: true });
     } else {
        currentClone[key] = updatedNextLevel;
     }
    return currentClone; // Return the modified clone
  };

  // 4. Start the recursion.
  return recurse(obj, pathArray);
};


/**
 * Compares two objects (potentially nested) and returns an array of paths
 * where differences are found. Compares values using Object.is.
 *
 * @param objA The first object.
 * @param objB The second object.
 * @returns An array of Path arrays representing the locations of differences.
 * @internal
 */
export const getChangedPaths = (objA: any, objB: any): PathArray[] => {
    const paths: PathArray[] = []; // Store results as PathArray

    function compare(a: any, b: any, currentPath: PathArray = []) {
        // 1. Identical values (Object.is)? Stop comparison for this branch.
        if (Object.is(a, b)) {
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
        const keysA = new Set(Object.keys(a));
        const keysB = new Set(Object.keys(b));
        const allKeys = new Set([...keysA, ...keysB]); // Union of keys

        allKeys.forEach(key => {
            // Determine the correct type for the path segment (number for array index, string otherwise)
            const pathSegment = Array.isArray(a) ? parseInt(key, 10) : key;
            const newPath = [...currentPath, pathSegment];
            const valA = a[key];
            const valB = b[key];

            // Check if key exists in one but not the other, or if values differ.
            if (!keysA.has(key) || !keysB.has(key) || !Object.is(valA, valB)) {
                // If both values are nested objects/arrays, recurse.
                if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
                     compare(valA, valB, newPath);
                } else {
                     // Otherwise, the difference is at this path.
                     paths.push(newPath);
                }
            }
        });
    }

    compare(objA, objB);
    return paths;
};
