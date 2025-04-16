import { Atom, Unsubscribe } from './core';
import { PathListener } from './events';
import { STORE_MAP_KEY_SET } from './keys';
import { Path } from './deepMapInternal';
/**
 * Represents a DeepMap Atom, extending the base Atom with methods
 * for setting values at specific paths and listening to path changes.
 */
export type DeepMap<T extends object> = Atom<T> & {
    /** Sets a value at a specific path within the object, creating a new object immutably. */
    setPath(path: Path, value: any, forceNotify?: boolean): void;
    /** Listens to changes at specific paths (including nested paths). */
    listenPaths(paths: Path[], listener: PathListener<T>): Unsubscribe;
    /** Internal marker symbol. */
    [STORE_MAP_KEY_SET]?: boolean;
};
/**
 * Creates a DeepMap Atom, optimized for managing nested object state.
 * Allows setting values at specific paths and subscribing to changes affecting those paths.
 *
 * @template T The type of the object state.
 * @param initialValue The initial object state. It's used directly (not copied initially).
 * @returns A DeepMap instance.
 */
export declare function deepMap<T extends object>(initialValue: T): DeepMap<T>;
