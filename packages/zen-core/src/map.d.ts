import type { KeyListener } from './events';
import type { MapAtom, Unsubscribe } from './types';
/**
 * Creates a Map Atom (functional style).
 * @template T The type of the object state.
 * @param initialValue The initial object state. A shallow copy is made.
 * @returns A MapAtom instance.
 */
export declare function map<T extends object>(initialValue: T): MapAtom<T>;
/**
 * Sets a specific key in the Map Atom, creating a new object immutably.
 * Notifies both map-level and key-specific listeners.
 */
export declare function setKey<T extends object, K extends keyof T>(
  mapAtom: MapAtom<T>,
  key: K,
  value: T[K],
  forceNotify?: boolean,
): void;
/**
 * Sets the entire value of the Map Atom, replacing the current object.
 * Notifies both map-level and relevant key-specific listeners.
 */
export declare function set<T extends object>(
  mapAtom: MapAtom<T>,
  nextValue: T,
  forceNotify?: boolean,
): void;
/** Listens to changes for specific keys within a Map Atom. */
export declare function listenKeys<T extends object, K extends keyof T>(
  mapAtom: MapAtom<T>,
  keys: K[],
  listener: KeyListener<T, K>,
): Unsubscribe;
