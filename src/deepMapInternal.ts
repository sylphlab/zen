// REMOVED: import { Path } from './core';

// Define Path type locally and export it
type PathString = string;
type PathArray = (string | number)[];
export type Path = PathString | PathArray;

// Export getDeep helper function
export const getDeep = (obj: any, path: Path, defaultValue: any = undefined): any => {
  if (path === null || path === undefined) return defaultValue;
  const processedPath = typeof path === 'string' ? path : Array.isArray(path) ? path : String(path);

  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(processedPath, regexp)
      .filter(Boolean)
      .reduce(
        (res: any, key: string) => (res !== null && res !== undefined ? res[key] : res),
        obj
      );
  const result = travel(/[\. ]+?/) ?? travel(/[,[\]]+?/); // Use nullish coalescing for robustness
  return result === undefined || result === obj ? defaultValue : result;
}

// Export setDeep helper function
export const setDeep = (obj: any, pathInput: Path, value: any): any => {
  const path = (
    Array.isArray(pathInput)
      ? pathInput
      : String(pathInput).match(/[^.[\]]+/g)
  )?.map(String) ?? [];

  if (path.length === 0) {
    return obj; // Noop for empty path
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
         return currentLevel; // No change needed
      }
    }

    const nextLevel = currentIsObject ? currentLevel[key] : undefined;
    const updatedNextLevel = recurse(nextLevel, remainingPath.slice(1));

    if (updatedNextLevel === nextLevel) {
      return currentLevel; // No change deeper down
    }

    const currentClone = currentIsObject ? (Array.isArray(currentLevel) ? [...currentLevel] : { ...currentLevel }) : (/^\d+$/.test(key) ? [] : {});
    currentClone[key] = updatedNextLevel;
    return currentClone;
  };

  return recurse(obj, path);
}
