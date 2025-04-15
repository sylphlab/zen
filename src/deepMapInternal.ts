// Define Path types locally and export them
export type PathString = string;
export type PathArray = (string | number)[];
export type Path = PathString | PathArray;

// Export getDeep helper function (simplified, assuming path is array for internal use)
export const getDeep = (obj: any, path: PathArray, defaultValue: any = undefined): any => {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = current[key];
  }
  return current === undefined ? defaultValue : current;
}

// Export setDeep helper function (using array path)
export const setDeep = (obj: any, path: Path, value: any): any => {
  const pathArray = (
    Array.isArray(path)
      ? path
      : String(path).match(/[^.[\]]+/g)?.map(s => /^\d+$/.test(s) ? parseInt(s, 10) : s) // Handle numeric keys in string path
  ) ?? [];

  // If path is empty (e.g., '' or []), it's a no-op, return original object.
  if (pathArray.length === 0) {
    return obj;
  }

  const recurse = (currentLevel: any, remainingPath: (string | number)[]): any => {
    const key = remainingPath[0];
    // Ensure key is defined before proceeding
    if (key === undefined) return currentLevel; // Should not happen with length check, but satisfies TS

    const currentIsObject = typeof currentLevel === 'object' && currentLevel !== null;

    if (remainingPath.length === 1) {
        // If currentLevel is not an object/array or the key doesn't exist or value is different
      if (!currentIsObject || !(key in currentLevel) || !Object.is(currentLevel[key], value)) {
         // Determine if the clone should be an array or object
         const isArrayIndex = /^\d+$/.test(String(key));
         const currentClone = currentIsObject ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...currentLevel }) : (isArrayIndex ? [] : {});

         // Ensure array is large enough if setting by index
         if (Array.isArray(currentClone) && typeof key === 'number' && key >= currentClone.length) {
            // Fill with undefined up to the index
            for(let i = currentClone.length; i < key; i++){
                currentClone[i] = undefined;
            }
         }
         currentClone[key] = value;
         return currentClone;
      } else {
         return currentLevel; // No change needed at this leaf
      }
    }

    // Ensure next level exists and is of the correct type (object/array)
    let nextLevel = currentIsObject ? currentLevel[key] : undefined; // key is guaranteed defined here
    const nextKey = remainingPath[1];
    // Ensure nextKey is defined before checking its type
    const nextKeyIsArrayIndex = nextKey !== undefined && /^\d+$/.test(String(nextKey));

    // If next level doesn't exist, create it based on the next key type
    if (nextLevel === undefined || nextLevel === null) {
       nextLevel = nextKeyIsArrayIndex ? [] : {};
    }

    const updatedNextLevel = recurse(nextLevel, remainingPath.slice(1));

    // If the deeper level didn't change, return the current level
    if (updatedNextLevel === nextLevel) {
      return currentLevel;
    }

    // Otherwise, create a clone of the current level and update the key
    const isArrayIndex = /^\d+$/.test(String(key)); // key is guaranteed defined here
    const currentClone = currentIsObject ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...currentLevel }) : (isArrayIndex ? [] : {});

    // Ensure array is large enough if setting by index (though less likely needed here)
     if (Array.isArray(currentClone) && typeof key === 'number' && key >= currentClone.length) {
        for(let i = currentClone.length; i < key; i++){
            currentClone[i] = undefined;
        }
     }
    currentClone[key] = updatedNextLevel;
    return currentClone;
  };

  return recurse(obj, pathArray);
}


// Helper function to compare two objects and find differing paths
export const getChangedPaths = (objA: any, objB: any): Path[] => {
    const paths: Path[] = [];

    function compare(a: any, b: any, currentPath: PathArray = []) {
        if (Object.is(a, b)) {
            return; // Objects/values are identical
        }

        // If one is null/undefined and the other is not, the current path changed
        if ((a === null || a === undefined) !== (b === null || b === undefined)) {
             paths.push([...currentPath]);
             return;
        }

        // If types are different, the current path changed
        if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
            paths.push([...currentPath]);
            return;
        }

        // If both are primitive or function, and not Object.is equal, the path changed
        if (typeof a !== 'object' || a === null) {
            paths.push([...currentPath]);
            return;
        }

        // If both are objects/arrays, compare keys/elements
        const keysA = new Set(Object.keys(a));
        const keysB = new Set(Object.keys(b));

        // Check keys present in A but not B, or vice-versa, or values different
        const allKeys = new Set([...keysA, ...keysB]);

        allKeys.forEach(key => {
            const pathSegment = Array.isArray(a) ? parseInt(key, 10) : key;
            const newPath = [...currentPath, pathSegment];

            if (!keysA.has(key) || !keysB.has(key) || !Object.is(a[key], b[key])) {
                // If values are objects, recurse. Otherwise, add the path.
                if (typeof a[key] === 'object' && a[key] !== null && typeof b[key] === 'object' && b[key] !== null) {
                     compare(a[key], b[key], newPath);
                } else {
                     paths.push(newPath);
                }
            }
        });
    }

    compare(objA, objB);
    return paths;
};
