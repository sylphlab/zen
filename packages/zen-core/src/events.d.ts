import { Atom, ReadonlyAtom, Unsubscribe } from './core';
import { STORE_MAP_KEY_SET } from './keys';
import { Path } from './deepMapInternal';
/** Listener for lifecycle events (onStart, onStop, etc.). */
export type LifecycleListener<T = any> = (value?: T) => void;
/** Listener for deepMap path changes. */
export type PathListener<T> = (value: any, path: Path, obj: T) => void;
/** Listener for map key changes. */
export type KeyListener<T, K extends keyof T = keyof T> = (value: T[K] | undefined, key: K, obj: T) => void;
/** Attaches a listener triggered when the first subscriber appears. */
export declare function onStart<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): Unsubscribe;
/** Attaches a listener triggered when the last subscriber disappears. */
export declare function onStop<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): Unsubscribe;
/** Attaches a listener triggered *before* a mutable atom's value is set (only outside batch). */
export declare function onSet<T>(a: Atom<T>, fn: LifecycleListener<T>): Unsubscribe;
/** Attaches a listener triggered *after* an atom's value listeners have been notified. */
export declare function onNotify<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): Unsubscribe;
/** Attaches a listener triggered immediately and only once upon attachment. */
export declare function onMount<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): Unsubscribe;
/**
 * Listens to changes at specific paths within a deepMap atom.
 * Relies on the atom having the `STORE_MAP_KEY_SET` symbol.
 * @param a The deepMap atom instance.
 * @param paths An array of paths (strings or arrays) to listen to.
 * @param fn The listener function.
 * @returns An unsubscribe function.
 */
export declare function listenPaths<T extends object>(a: Atom<T> & {
    [STORE_MAP_KEY_SET]?: boolean;
}, // Check for map/deepMap marker
paths: Path[], fn: PathListener<T>): Unsubscribe;
/**
 * Internal function called by deepMap's patched `set` to emit path changes.
 * @param a The deepMap atom.
 * @param changedPaths Array of paths that actually changed.
 * @param finalValue The final state object after changes.
 * @internal
 */
export declare function _emitPathChanges<T extends object>(a: Atom<T>, changedPaths: Path[], finalValue: T): void;
/**
 * Listens to changes for specific keys within a map atom.
 * Relies on the atom having the `STORE_MAP_KEY_SET` symbol.
 * @param a The map atom instance.
 * @param keys An array of keys to listen to.
 * @param fn The listener function.
 * @returns An unsubscribe function.
 */
export declare function listenKeys<T extends object, K extends keyof T>(a: Atom<T> & {
    [STORE_MAP_KEY_SET]?: boolean;
}, // Check for map/deepMap marker
keys: K[], fn: KeyListener<T, K>): Unsubscribe;
/**
 * Internal function called by map's patched `set` to emit key changes.
 * @param a The map atom.
 * @param changedKeys Array of keys that actually changed.
 * @param finalValue The final state object after changes.
 * @internal
 */
export declare function _emitKeyChanges<T extends object>(a: Atom<T>, changedKeys: ReadonlyArray<keyof T>, finalValue: T): void;
