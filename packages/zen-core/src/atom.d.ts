import { Atom } from './core';
/**
 * Creates a new atom, the basic unit of state.
 * Atoms hold a value and allow subscriptions to changes.
 * Event and batching logic are applied via patching (see events.ts, batch.ts).
 * @param initialValue The initial value of the atom.
 * @returns An Atom instance.
 */
export declare function atom<T>(initialValue: T): Atom<T>;
