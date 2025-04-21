import type { AnyAtom, AtomValue, Unsubscribe } from './types';
/**
 * Subscribes to multiple stores and runs a callback function when any of them change.
 * The callback receives the current values of the stores as arguments.
 * If the callback returns a function, it will be treated as a cleanup function
 * and executed before the next callback run or when the effect is cancelled.
 *
 * @param stores An array of stores to subscribe to.
 * @param callback The function to run on changes. It receives store values as arguments.
 * @returns A function to cancel the effect and unsubscribe from all stores.
 */
export declare function effect<Stores extends AnyAtom[]>(
  stores: [...Stores],
  callback: (
    ...values: {
      [K in keyof Stores]: AtomValue<Stores[K]>;
    }
  ) => undefined | (() => void),
): Unsubscribe;
