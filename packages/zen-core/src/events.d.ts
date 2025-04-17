import type { Atom } from './atom';
import type { /* Listener, */ Unsubscribe, AnyAtom, AtomValue, MapAtom, DeepMapAtom } from './types';
/**
 * Gets a value from a nested object based on a path.
 * @param obj The object to read from.
 * @param path The path (string or array) to the desired value.
 * @returns The value at the path, or undefined if the path doesn't exist.
 * @internal
 */
export declare const getDeep: (obj: unknown, path: PathArray) => unknown;
export type PathString = string;
export type PathArray = (string | number)[];
/** Represents a path within a nested object, either as a dot-separated string or an array of keys/indices. */
export type Path = PathString | PathArray;
/** Listener for lifecycle events (onStart, onStop, etc.). */
export type LifecycleListener<T = unknown> = (value?: T) => void;
/** Listener for deepMap path changes. */
export type PathListener<T extends object, V = unknown> = (value: V, path: Path, obj: T) => void;
/** Listener for map key changes. */
export type KeyListener<T extends object, K extends keyof T = keyof T> = (value: T[K] | undefined, key: K, obj: T) => void;
/** Attaches a listener triggered when the first subscriber appears. */
export declare function onStart<A extends AnyAtom>(a: A, fn: LifecycleListener<AtomValue<A>>): Unsubscribe;
/** Attaches a listener triggered when the last subscriber disappears. */
export declare function onStop<A extends AnyAtom>(a: A, fn: LifecycleListener<AtomValue<A>>): Unsubscribe;
/** Attaches a listener triggered *before* a mutable atom's value is set (only outside batch). */
export declare function onSet<T>(a: Atom<T>, fn: LifecycleListener<T>): Unsubscribe;
/** Attaches a listener triggered *after* an atom's value listeners have been notified. */
export declare function onNotify<A extends AnyAtom>(a: A, fn: LifecycleListener<AtomValue<A>>): Unsubscribe;
/** Attaches a listener triggered immediately and only once upon attachment. */
export declare function onMount<A extends AnyAtom>(a: A, fn: LifecycleListener<AtomValue<A>>): Unsubscribe;
/**
 * Listens to changes at specific paths within a deepMap atom.
 * Relies on the internal atom having the `STORE_MAP_KEY_SET` symbol.
 */
export declare function listenPaths<A extends MapAtom<any> | DeepMapAtom<any>>(// Add MapAtom back
a: A, paths: Path[], fn: PathListener<AtomValue<A>>): Unsubscribe;
/**
 * Internal function called by map/deepMap `set` functions to emit path changes.
 * @param a The *internal* atom of the map/deepMap.
 * @param changedPaths Array of paths that actually changed.
 * @param finalValue The final state object after changes.
 * @internal
 */
export declare function _emitPathChanges<A extends MapAtom<any> | DeepMapAtom<any>>(// Add MapAtom back
a: A, changedPaths: Path[], finalValue: AtomValue<A>): void;
/**
 * Listens to changes for specific keys within a map atom.
 * Relies on the internal atom having the `STORE_MAP_KEY_SET` symbol.
 */
export declare function listenKeys<A extends MapAtom<any> | DeepMapAtom<any>, K extends keyof AtomValue<A>>(// Add MapAtom back
a: A, keys: K[], fn: KeyListener<AtomValue<A>, K>): Unsubscribe;
/**
 * Internal function called by map/deepMap `set` functions to emit key changes.
 * @param a The *internal* atom of the map/deepMap.
 * @param changedKeys Array of keys that actually changed.
 * @param finalValue The final state object after changes.
 * @internal
 */
export declare function _emitKeyChanges<A extends MapAtom<any> | DeepMapAtom<any>>(// Add MapAtom back
a: A, changedKeys: ReadonlyArray<keyof AtomValue<A>>, finalValue: AtomValue<A>): void;
