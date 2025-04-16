// Core type definitions for the functional zen state management library.
import type { LifecycleListener } from './events'; // Keep for event function signatures

/** Callback function type for atom listeners. */
export type Listener<T> = (value: T, oldValue?: T | null) => void; // oldValue can be null initially
/** Function to unsubscribe a listener. */
export type Unsubscribe = () => void;

// --- Core Types (Functional Style) ---

// Removed AtomTypes constant

/** Base structure for atoms that directly hold value and listeners. */
export type AtomWithValue<T> = { // Export AtomWithValue
    // Removed $$id and $$type
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

/** Represents a writable atom (functional style). */
export type Atom<T = any> = AtomWithValue<T> & {
    // Removed $$type
    _value: T; // Regular atoms always have an initial value
};

/** Represents a read-only atom (functional style). */
export type ReadonlyAtom<T = any> = AtomWithValue<T> & {
    // Removed $$type
    _value: T | null; // Readonly might start as null (computed)
};

/** Represents a computed atom's specific properties (functional style). */
export type ComputedAtom<T = any> = ReadonlyAtom<T> & {
    // Removed $$type
    _value: T | null; // Computed starts as null
    _dirty: boolean;
    readonly _sources: ReadonlyArray<AnyAtom>; // Use AnyAtom recursively
    _sourceValues: any[];
    readonly _calculation: Function;
    readonly _equalityFn: (a: T, b: T) => boolean;
    _unsubscribers?: Unsubscribe[];
    // Add internal methods needed by functional API calls
    _update: () => boolean;
    _subscribeToSources: () => void;
    _unsubscribeFromSources: () => void;
};

/** Represents a functional Map Atom structure. */
export type MapAtom<T extends object = any> = {
    // Removed $$id and $$type
    readonly _internalAtom: Atom<T>; // The actual atom holding the object state
};

/** Represents a functional DeepMap Atom structure. */
export type DeepMapAtom<T extends object = any> = {
    // Removed $$id and $$type
    readonly _internalAtom: Atom<T>; // The actual atom holding the object state
};

/** Represents a Task Atom, which wraps an asynchronous function
 * and provides its state (loading, error, data) reactively.
 */
export type TaskAtom<T = any> = {
  // Removed $$id and $$type
  readonly _stateAtom: Atom<TaskState<T>>;
  readonly _asyncFn: (...args: any[]) => Promise<T>; // Store the async function
};

/** Type definition for the state managed by a Task Atom. */
export type TaskState<T = any> = {
  loading: boolean;
  error?: Error;
  data?: T;
};

/** Union type for any kind of atom. */
// Added TaskAtom to the union type
export type AnyAtom<T = any> = Atom<T> | ReadonlyAtom<T> | MapAtom<T extends object ? T : any> | DeepMapAtom<T extends object ? T : any> | TaskAtom<T>;


// --- Internal Helper Functions ---

/**
 * Gets the underlying atom that holds the value and listeners.
 * For Regular and Computed atoms, it's the atom itself.
 * For Map/DeepMap atoms, it's the internal atom.
 * @internal
 */
export function getBaseAtom<T>(atom: AnyAtom<T>): AtomWithValue<any> { // Return type changed to AtomWithValue<any> for simplicity
    // Check for Map/DeepMap by looking for _internalAtom
    if ('_internalAtom' in atom) {
        return (atom as MapAtom | DeepMapAtom)._internalAtom;
    }
    // Check for TaskAtom by looking for _stateAtom
    if ('_stateAtom' in atom) {
        return (atom as TaskAtom)._stateAtom;
    }
    // Otherwise, assume it's an Atom or ReadonlyAtom (which are AtomWithValue)
    return atom as AtomWithValue<any>;
}


/**
 * Notifies all listeners of an atom about a value change.
 * Handles both value listeners and lifecycle listeners (onNotify).
 * @internal - Exported for use by other modules like atom, computed, batch.
 */
export function notifyListeners<T>(atom: AnyAtom<T>, value: T, oldValue?: T | null): void {
    const baseAtom = getBaseAtom(atom); // Use helper to get the atom with listeners

    const ls = baseAtom._listeners;
    // Notify regular value listeners first
    if (ls?.size) {
        for (const fn of ls) {
            try {
                fn(value, oldValue);
            } catch (e) {
                console.error(`Error in value listener for atom ${String(atom)}:`, e);
            }
        }
    }
    // Notify onNotify listeners AFTER value listeners
    baseAtom._notifyListeners?.forEach(fn => {
        try { fn(value); } catch(e) { console.error(`Error in onNotify listener for atom ${String(atom)}:`, e); }
    });
}

// Removed TaskAtom and TaskState definitions from here as they are now above

// --- Core Functions (Placeholder Comments) ---

// get(atom)
// setAtomValue(atom, value)
// subscribeToAtom(atom, listener)

// --- Removed AtomProto ---
// No longer using prototype-based approach.