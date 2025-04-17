// Base type definitions shared across the library.
import type { LifecycleListener } from './events'; // Keep for event function signatures (might move later)
import type { Atom } from './atom';
import type { ComputedAtom } from './computed'; // Only import ComputedAtom
// ReadonlyAtom will be an alias, MapAtom, DeepMapAtom, TaskAtom defined below

/** Callback function type for atom listeners. */
export type Listener<T> = (value: T, oldValue?: T | null) => void;

/** Function to unsubscribe a listener. */
export type Unsubscribe = () => void;

/** Base structure for atoms that directly hold value and listeners. */
export type AtomWithValue<T> = {
    /** Distinguishes atom types for faster checks */
    _kind: 'atom' | 'computed' | 'map' | 'deepMap' | 'task';
    /** Current value */
    _value: T; // Value type enforced by generic, no null default
    /** Value listeners (Set for efficient add/delete/has) */
    _listeners?: Set<Listener<T>>;
    /** Lifecycle listeners (Set for efficient add/delete) */
    _startListeners?: Set<LifecycleListener<T>>;
    _stopListeners?: Set<LifecycleListener<T>>;
    _setListeners?: Set<LifecycleListener<T>>; // Only applicable to writable atoms
    _notifyListeners?: Set<LifecycleListener<T>>;
    _mountListeners?: Set<LifecycleListener<T>>;
};

/** Type definition for the state managed by a Task Atom. */
export type TaskState<T> = {
  loading: boolean;
  error?: Error;
  data?: T;
};

// --- Merged Atom Type Definitions ---

/** Represents a Map Atom directly holding state and listeners. */
export type MapAtom<T extends object = object> = AtomWithValue<T> & { // Default to object, not any
    _kind: 'map';
    // No extra properties needed, structure matches AtomWithValue<Object>
};

/** Represents a DeepMap Atom directly holding state and listeners. */
export type DeepMapAtom<T extends object = object> = AtomWithValue<T> & { // Default to object, not any
     _kind: 'deepMap';
    // No extra properties needed, structure matches AtomWithValue<Object>
};

/** Represents a Task Atom directly holding TaskState and listeners. */
// Add Args generic for async function arguments, default to unknown[]
// Extend AtomWithValue for consistency, remove unused _setListeners
export type TaskAtom<T, Args extends unknown[] = unknown[]> = AtomWithValue<TaskState<T>> & {
    _kind: 'task';
    readonly _asyncFn: (...args: Args) => Promise<T>;
    // _setListeners is inherited but not used by task logic
    _setListeners?: never; // Explicitly mark as unused/unavailable if desired, or just omit specific logic
};

/** Utility type to extract the value type from any atom type. */
export type AtomValue<A extends AnyAtom> = A extends AtomWithValue<infer V> ? V : never;

/** Union type for any kind of atom structure recognized by the library. */
// This union represents the structure, use AtomValue<A> to get the value type.
export type AnyAtom = Atom<any> | ComputedAtom<any> | MapAtom<any> | DeepMapAtom<any> | TaskAtom<any, any[]>;