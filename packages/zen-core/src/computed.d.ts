import { Atom, ReadonlyAtom, Unsubscribe } from './core';
/** Represents an array of source atoms (can be Atom or ReadonlyAtom). */
type Stores = ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
/** Utility type to extract the value types from an array of Stores. */
type StoreValues<S extends Stores> = {
    [K in keyof S]: S[K] extends Atom<infer V> | ReadonlyAtom<infer V> ? V : never;
};
/**
 * Internal type representing the structure of a computed atom instance.
 * Extends ReadonlyAtom and adds properties specific to derived state.
 */
type ComputedAtom<T> = ReadonlyAtom<T> & {
    _sources: ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
    _sourceValues: any[];
    _calculation: Function;
    _equalityFn: (a: T, b: T) => boolean;
    _dirty: boolean;
    _isSubscribing: boolean;
    _update(): boolean;
    _onChange(): void;
    _subscribeToSources(): void;
    _unsubscribeFromSources(): void;
    _unsubscribers?: Unsubscribe[];
    _onChangeHandler?: () => void;
};
/**
 * Prototype for computed atoms. Inherits from CoreAtomProto and overrides
 * methods like `get` and `subscribe` to handle derived state logic.
 */
export declare const ComputedAtomProto: ComputedAtom<any>;
/**
 * Creates a read-only computed atom.
 * Its value is derived from one or more source atoms using a calculation function.
 *
 * @template T The type of the computed value.
 * @template S Tuple type of the source stores.
 * @param stores An array or tuple of source atoms (Atom or ReadonlyAtom).
 * @param calculation A function that takes the current values of the source stores
 *   as arguments and returns the computed value.
 * @param equalityFn Optional function to compare the old and new computed values.
 *   Defaults to `Object.is`. If it returns true, listeners are not notified.
 * @returns A ReadonlyAtom representing the computed value.
 */
export declare function computed<T, S extends Stores>(stores: S, calculation: (...values: StoreValues<S>) => T, equalityFn?: (a: T, b: T) => boolean): ReadonlyAtom<T>;
export {};
