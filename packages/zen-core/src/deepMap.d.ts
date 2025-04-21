import { get as getCoreValue, subscribe as subscribeToCoreAtom } from './atom';
import type { PathListener } from './events';
import type { DeepMapAtom, Unsubscribe } from './types';
export type PathString = string;
export type PathArray = (string | number)[];
/** Represents a path within a nested object, either as a dot-separated string or an array of keys/indices. */
export type Path = PathString | PathArray;
/**
 * Creates a DeepMap Atom (functional style).
 * @template T The type of the object state.
 * @param initialValue The initial object state. It's used directly.
 * @returns A DeepMapAtom instance.
 */
export declare function deepMap<T extends object>(initialValue: T): DeepMapAtom<T>;
export { getCoreValue as get, subscribeToCoreAtom as subscribe };
/**
 * Sets a value at a specific path within the DeepMap Atom, creating a new object immutably.
 * Notifies both map-level and relevant path-specific listeners. (Restored logic)
 */
export declare function setPath<T extends object>(
  deepMapAtom: DeepMapAtom<T>,
  path: Path,
  value: unknown,
  forceNotify?: boolean,
): void;
/**
 * Sets the entire value of the DeepMap Atom, replacing the current object.
 * Notifies both map-level and relevant path-specific listeners. (Restored logic)
 */
export declare function set<T extends object>(
  deepMapAtom: DeepMapAtom<T>,
  nextValue: T,
  forceNotify?: boolean,
): void;
/** Listens to changes for specific paths within a DeepMap Atom. (Restored) */
export declare function listenPaths<T extends object>(
  deepMapAtom: DeepMapAtom<T>,
  paths: Path[],
  listener: PathListener<T>,
): Unsubscribe;
