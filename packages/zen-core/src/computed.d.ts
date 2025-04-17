import type { Unsubscribe, AnyAtom, AtomWithValue } from './types';
/** Represents a computed atom's specific properties (functional style). */
export type ComputedAtom<T = unknown> = AtomWithValue<T | null> & {
    _kind: 'computed';
    _value: T | null;
    _dirty: boolean;
    readonly _sources: ReadonlyArray<AnyAtom>;
    _sourceValues: unknown[];
    readonly _calculation: (...values: unknown[]) => T;
    readonly _equalityFn: (a: T, b: T) => boolean;
    _unsubscribers?: Unsubscribe[];
    _update: () => boolean;
    _subscribeToSources: () => void;
    _unsubscribeFromSources: () => void;
};
/** Alias for ComputedAtom, representing the read-only nature. */
export type ReadonlyAtom<T = unknown> = ComputedAtom<T>;
/** Represents an array of source atoms. */
type Stores = ReadonlyArray<AnyAtom>;
/**
 * Creates a read-only computed atom (functional style).
 * Its value is derived from one or more source atoms using a calculation function.
 *
 * @template T The type of the computed value.
 * @template S Tuple type of the source stores.
 * @param stores An array or tuple of source atoms (AnyAtom).
 * @param calculation A function that takes the current values of the source stores
 *   as individual arguments and returns the computed value.
 * @param equalityFn Optional function to compare the old and new computed values.
 *   Defaults to `Object.is`. If it returns true, listeners are not notified.
 * @returns A ReadonlyAtom representing the computed value.
 */
export declare function computed<T, S extends AnyAtom | Stores>(// Allow single atom or array
stores: S, calculation: (...values: unknown[]) => T, equalityFn?: (a: T, b: T) => boolean): ReadonlyAtom<T>;
export {};
