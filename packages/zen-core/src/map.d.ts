import { Atom, Unsubscribe } from './core';
import { KeyListener } from './events';
import { STORE_MAP_KEY_SET } from './keys';
/**
 * Represents a Map Atom, extending the base Atom with methods
 * for setting specific keys and listening to key changes.
 */
export type MapAtom<T extends object> = Atom<T> & {
    /** Sets a specific key in the map object, creating a new object immutably. */
    setKey<K extends keyof T>(key: K, value: T[K], forceNotify?: boolean): void;
    /** Listens to changes for specific keys. */
    listenKeys<K extends keyof T>(keys: K[], listener: KeyListener<T, K>): Unsubscribe;
    /** Internal marker symbol. */
    [STORE_MAP_KEY_SET]?: boolean;
};
/**
 * Creates a Map Atom, optimized for managing object state.
 * Allows setting individual keys and subscribing to changes for specific keys.
 *
 * @template T The type of the object state.
 * @param initialValue The initial object state. A shallow copy is made.
 * @returns A MapAtom instance.
 */
export declare function map<T extends object>(initialValue: T): MapAtom<T>;
