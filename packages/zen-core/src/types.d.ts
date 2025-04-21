import type { Atom } from './atom';
import type { BatchedAtom } from './batched';
import type { ComputedAtom } from './computed';
/** Callback function type for atom listeners. */
export type Listener<T> = (value: T, oldValue?: T | null) => void;
/** Function to unsubscribe a listener. */
export type Unsubscribe = () => void;
/** Base structure for atoms that directly hold value and listeners. */
export type AtomWithValue<T> = {
  /** Distinguishes atom types for faster checks */
  _kind: 'atom' | 'computed' | 'map' | 'deepMap' | 'task' | 'batched';
  /** Current value */
  _value: T;
  /** Value listeners (Set for efficient add/delete/has) */
  _listeners?: Set<Listener<T>>;
  _startListeners?: Set<any>;
  _stopListeners?: Set<any>;
  _setListeners?: Set<any>;
  _notifyListeners?: Set<any>;
  _mountListeners?: Set<any>;
  _keyListeners?: Map<any, Set<any>>;
  _pathListeners?: Map<any, Set<any>>;
  _mountCleanups?: Map<any, Function | undefined>;
};
/** Represents the possible states of a TaskAtom. */
export type TaskState<T = unknown> =
  | {
      loading: true;
      error?: undefined;
      data?: undefined;
    }
  | {
      loading: false;
      error: Error;
      data?: undefined;
    }
  | {
      loading: false;
      error?: undefined;
      data: T;
    }
  | {
      loading: false;
      error?: undefined;
      data?: undefined;
    };
/** Represents a Map Atom directly holding state and listeners. */
export type MapAtom<T extends object = object> = AtomWithValue<T> & {
  _kind: 'map';
};
/** Represents a DeepMap Atom directly holding state and listeners. */
export type DeepMapAtom<T extends object = object> = AtomWithValue<T> & {
  _kind: 'deepMap';
};
/** Represents a Task Atom holding state and the async function. */
export type TaskAtom<T = void, Args extends unknown[] = unknown[]> = AtomWithValue<TaskState<T>> & {
  _kind: 'task';
  _asyncFn: (...args: Args) => Promise<T>;
};
/** Utility type to extract the value type from any atom type. */
export type AtomValue<A extends AnyAtom> = A extends AtomWithValue<infer V> ? V : never;
/** Union type for any kind of atom structure recognized by the library. */
export type AnyAtom =
  | Atom<any>
  | ComputedAtom<any>
  | MapAtom<object>
  | DeepMapAtom<object>
  | TaskAtom<any, any>
  | BatchedAtom<any>;
