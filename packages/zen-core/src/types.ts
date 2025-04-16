// Base type definitions shared across the library.
import type { LifecycleListener } from './events'; // Keep for event function signatures (might move later)
import type { Atom } from './atom'; // Import specific types from their modules
import type { ReadonlyAtom, ComputedAtom } from './computed'; // Import specific types
import type { MapAtom } from './map'; // Import specific types
import type { DeepMapAtom } from './deepMap'; // Import specific types
import type { TaskAtom } from './task'; // Import specific types

/** Callback function type for atom listeners. */
export type Listener<T> = (value: T, oldValue?: T | null) => void; // oldValue can be null initially

/** Function to unsubscribe a listener. */
export type Unsubscribe = () => void;

/** Base structure for atoms that directly hold value and listeners. */
export type AtomWithValue<T> = {
    /** Current value */
    _value: T | null; // Allow null for computed initial state
    /** Value listeners */
    _listeners?: Set<Listener<T>>;
    /** Lifecycle listeners */
    _startListeners?: Set<LifecycleListener<T>>;
    _stopListeners?: Set<LifecycleListener<T>>;
    _setListeners?: Set<LifecycleListener<T>>; // Only applicable to writable atoms
    _notifyListeners?: Set<LifecycleListener<T>>;
    _mountListeners?: Set<LifecycleListener<T>>;
};

/** Type definition for the state managed by a Task Atom. */
export type TaskState<T = any> = {
  loading: boolean;
  error?: Error;
  data?: T;
};

/** Union type for any kind of atom structure recognized by the library. */
// Using simpler version as conditional type caused issues.
export type AnyAtom<T = any> = Atom<T> | ReadonlyAtom<T> | MapAtom<any> | DeepMapAtom<any> | TaskAtom<any>;