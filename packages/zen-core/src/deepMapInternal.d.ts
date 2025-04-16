export type PathString = string;
export type PathArray = (string | number)[];
/** Represents a path within a nested object, either as a dot-separated string or an array of keys/indices. */
export type Path = PathString | PathArray;
/**
 * Gets a value from a nested object based on a path array.
 * @param obj The object to traverse.
 * @param path An array representing the path (e.g., ['user', 'address', 0, 'street']).
 * @param defaultValue Value to return if the path doesn't exist.
 * @returns The value at the specified path or the default value.
 * @internal
 */
export declare const getDeep: (obj: any, path: PathArray, defaultValue?: any) => any;
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
export declare const setDeep: (obj: any, path: Path, value: any) => any;
/**
 * Compares two objects (potentially nested) and returns an array of paths
 * where differences are found. Compares values using Object.is.
 *
 * @param objA The first object.
 * @param objB The second object.
 * @returns An array of Path arrays representing the locations of differences.
 * @internal
 */
export declare const getChangedPaths: (objA: any, objB: any) => PathArray[];
