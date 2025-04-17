import type { Listener, Unsubscribe, AnyAtom, AtomValue, AtomWithValue, MapAtom, DeepMapAtom, TaskAtom, TaskState } from './types';
import type { ComputedAtom } from './computed';
/** Tracks the nesting depth of batch calls. @internal */
export declare let batchDepth: number;
/**
 * Notifies all listeners of an atom about a value change.
 * @internal - Exported for use by other modules like computed, deepMap.
 */
export declare function notifyListeners<A extends AnyAtom>(atom: A, value: AtomValue<A>, oldValue?: AtomValue<A>): void;
/** Represents a writable atom (functional style). */
export type Atom<T = unknown> = AtomWithValue<T> & {
    _value: T;
};
/**
 * Gets the current value of an atom. Provides specific return types based on atom kind.
 * @param atom The atom to read from.
 * @returns The current value.
 */
export declare function get<T>(atom: Atom<T>): T;
export declare function get<T>(atom: ComputedAtom<T>): T | null;
export declare function get<T extends object>(atom: MapAtom<T>): T;
export declare function get<T extends object>(atom: DeepMapAtom<T>): T;
export declare function get<T>(atom: TaskAtom<T>): TaskState<T>;
/**
 * Sets the value of a writable atom. Notifies listeners immediately.
 * @param atom The atom to write to.
 * @param value The new value.
 * @param force If true, notify listeners even if the value is the same.
 */
export declare function set<T>(atom: Atom<T>, value: T, force?: boolean): void;
/**
 * Subscribes a listener function to an atom's changes.
 * Calls the listener immediately with the current value.
 * Returns an unsubscribe function.
 * @param atom The atom to subscribe to.
 * @param listener The function to call on value changes.
 * @returns A function to unsubscribe the listener.
 */
export declare function subscribe<A extends AnyAtom>(atom: A, listener: Listener<AtomValue<A>>): Unsubscribe;
/**
 * Creates a new writable atom (functional style).
 * @param initialValue The initial value of the atom.
 * @returns An Atom instance.
 */
export declare function atom<T>(initialValue: T): Atom<T>;
/**
 * Checks if the code is currently executing within a `batch()` call.
 * @internal
 */
export declare function isInBatch(): boolean;
/**
 * Queues an atom for notification at the end of the batch.
 * Stores the original value before the batch started if it's the first change for this atom in the batch.
 * @internal
 */
export declare function queueAtomForBatch<T>(atom: Atom<T>, originalValue: T): void;
/**
 * Executes a function, deferring all atom listener notifications until the function completes.
 * Batches can be nested; notifications only run when the outermost batch finishes.
 * @param fn The function to execute within the batch.
 * @returns The return value of the executed function.
 */
export declare function batch<T>(fn: () => T): T;
