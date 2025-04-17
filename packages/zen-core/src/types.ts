// Base type definitions shared across the library.
// import type { LifecycleListener, KeyListener, PathListener } from './events'; // Remove unused imports
import type { Atom } from './atom';
import type { ComputedAtom } from './computed'; // Only import ComputedAtom
import type { BatchedAtom } from './batched'; // Import BatchedAtom
// ReadonlyAtom will be an alias, DeepMapAtom defined below

/** Callback function type for atom listeners. */
export type Listener<T> = (value: T, oldValue?: T | null) => void;

/** Function to unsubscribe a listener. */
export type Unsubscribe = () => void;

/** Base structure for atoms that directly hold value and listeners. */
export type AtomWithValue<T> = {
    /** Distinguishes atom types for faster checks */
    _kind: 'atom' | 'computed' | 'map' | 'deepMap' | 'task' | 'batched'; // Add 'batched'
    /** Current value */
    _value: T; // Value type enforced by generic, no null default
    /** Value listeners (Set for efficient add/delete/has) */
    _listeners?: Set<Listener<T>>;
    // Restore lifecycle listener properties using broader types for simplicity
    _startListeners?: Set<any>; // Use Set<any> or Set<Function>
    _stopListeners?: Set<any>;
    _setListeners?: Set<any>;
    _notifyListeners?: Set<any>;
    _mountListeners?: Set<any>;
    // Add properties for map/deepMap listeners using broader types
    _keyListeners?: Map<any, Set<any>>;
    _pathListeners?: Map<any, Set<any>>;
    _mountCleanups?: Map<any, Function | void>;
};

/** Represents the possible states of a TaskAtom. */
export type TaskState<T = unknown> = // Add TaskState back
  | { loading: true; error?: undefined; data?: undefined }
  | { loading: false; error: Error; data?: undefined }
  | { loading: false; error?: undefined; data: T }
  | { loading: false; error?: undefined; data?: undefined }; // Initial state

// --- Merged Atom Type Definitions ---

/** Represents a Map Atom directly holding state and listeners. */
export type MapAtom<T extends object = object> = AtomWithValue<T> & { // Add MapAtom back
    _kind: 'map';
    // No extra properties needed, structure matches AtomWithValue<Object>
};

/** Represents a DeepMap Atom directly holding state and listeners. */
export type DeepMapAtom<T extends object = object> = AtomWithValue<T> & { // Default to object, not any
    _kind: 'deepMap';
    // No extra properties needed, structure matches AtomWithValue<Object>
};

/** Represents a Task Atom holding state and the async function. */
export type TaskAtom<T = void, Args extends unknown[] = unknown[]> = AtomWithValue<TaskState<T>> & { // Add TaskAtom back
    _kind: 'task';
    _asyncFn: (...args: Args) => Promise<T>;
};

/** Utility type to extract the value type from any atom type. */
export type AtomValue<A extends AnyAtom> = A extends AtomWithValue<infer V> ? V : never;

/** Union type for any kind of atom structure recognized by the library. */
// This union represents the structure, use AtomValue<A> to get the value type.
export type AnyAtom = Atom<any> | ComputedAtom<any> | MapAtom<object> | DeepMapAtom<object> | TaskAtom<any, any> | BatchedAtom<any>; // Add BatchedAtom<any>