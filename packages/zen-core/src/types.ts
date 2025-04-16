// Base type definitions shared across the library.
import type { LifecycleListener } from './events'; // Keep for event function signatures (might move later)
import type { Atom } from './atom';
import type { ComputedAtom } from './computed'; // Only import ComputedAtom
// ReadonlyAtom will be an alias, MapAtom, DeepMapAtom, TaskAtom defined below

/** Callback function type for atom listeners. */
export type Listener<T> = (value: T, oldValue?: T | null) => void; // oldValue can be null initially

/** Function to unsubscribe a listener. */
export type Unsubscribe = () => void;

/** Base structure for atoms that directly hold value and listeners. */
export type AtomWithValue<T> = {
    /** Distinguishes atom types for faster checks */
    _kind: 'atom' | 'computed' | 'map' | 'deepMap' | 'task'; // Added 'task', removed 'taskState'
    /** Current value */
    _value: T | null; // Allow null for computed initial state
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
export type TaskState<T = unknown> = {
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
export type TaskAtom<T = unknown, Args extends unknown[] = unknown[]> = {
    _kind: 'task';
    _value: TaskState<T>; // Explicitly state the value type
    readonly _asyncFn: (...args: Args) => Promise<T>; // Use Args generic
    // Include properties from AtomWithValue<TaskState<T>>
    _listeners?: Set<Listener<TaskState<T>>>;
    _startListeners?: Set<LifecycleListener<TaskState<T>>>;
    _stopListeners?: Set<LifecycleListener<TaskState<T>>>;
    _setListeners?: Set<LifecycleListener<TaskState<T>>>; // Technically not used by task, but keep for consistency?
    _notifyListeners?: Set<LifecycleListener<TaskState<T>>>;
    _mountListeners?: Set<LifecycleListener<TaskState<T>>>;
};


/** Union type for any kind of atom structure recognized by the library. */
// Use <any> for Map/DeepMap/TaskAtom as their value type isn't directly T
// Update TaskAtom usage to include Args generic (using any[] for broad compatibility here)
export type AnyAtom<T = unknown> = Atom<T> | ComputedAtom<T> | MapAtom<object> | DeepMapAtom<object> | TaskAtom<T, unknown[]>; // Use unknown[] for TaskAtom Args