import type { AnyAtom, AtomValue, Listener, Unsubscribe } from './types';
export type BatchedAtom<T = unknown> = {
  _kind: 'batched';
  _value: T | null;
  _stores: AnyAtom[];
  _calculation: (...values: any[]) => T;
  _listeners?: Set<Listener<T | null>>;
  _dirty: boolean;
  _pendingUpdate: boolean;
  _unsubscribers: Unsubscribe[];
  _update: () => void;
  _subscribeToSources: () => void;
  _unsubscribeFromSources: () => void;
};
export declare function batched<T, S1 extends AnyAtom>(
  store1: S1,
  calculation: (value1: AtomValue<S1>) => T,
): BatchedAtom<T>;
export declare function batched<T, Stores extends AnyAtom[]>(
  stores: [...Stores],
  calculation: (
    ...values: {
      [K in keyof Stores]: AtomValue<Stores[K]>;
    }
  ) => T,
): BatchedAtom<T>;
