// Base type definitions shared across the library.
// import type { LifecycleListener } from './events'; // Removed import
import type { Atom } from './atom';
import type { ComputedAtom } from './computed'; // Only import ComputedAtom
// ReadonlyAtom will be an alias, DeepMapAtom defined below

/** Callback function type for atom listeners. */
export type Listener<T> = (value: T, oldValue?: T | null) => void;

/** Function to unsubscribe a listener. */
export type Unsubscribe = () => void;

/** Base structure for atoms that directly hold value and listeners. */
export type AtomWithValue<T> = {
    /** Distinguishes atom types for faster checks */
    _kind: 'atom' | 'computed' | 'deepMap'; // Removed 'map' and 'task'
    /** Current value */
    _value: T; // Value type enforced by generic, no null default
    /** Value listeners (Set for efficient add/delete/has) */
    _listeners?: Set<Listener<T>>;
    // Lifecycle listeners removed (_startListeners, _stopListeners, etc.)
};

// TaskState type removed

// --- Merged Atom Type Definitions ---

// MapAtom type removed

/** Represents a DeepMap Atom directly holding state and listeners. */
export type DeepMapAtom<T extends object = object> = AtomWithValue<T> & { // Default to object, not any
    _kind: 'deepMap';
    // No extra properties needed, structure matches AtomWithValue<Object>
};

// TaskAtom type removed

/** Utility type to extract the value type from any atom type. */
export type AtomValue<A extends AnyAtom> = A extends AtomWithValue<infer V> ? V : never;

/** Union type for any kind of atom structure recognized by the library. */
// This union represents the structure, use AtomValue<A> to get the value type.
export type AnyAtom = Atom<unknown> | ComputedAtom<unknown> | DeepMapAtom<object>; // Removed MapAtom and TaskAtom