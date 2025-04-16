// Core type definitions for the functional zen state management library.
import type { LifecycleListener } from './events'; // Keep for event function signatures

/** Callback function type for atom listeners. */
export type Listener<T> = (value: T, oldValue?: T | null) => void; // oldValue can be null initially
/** Function to unsubscribe a listener. */
export type Unsubscribe = () => void;

// --- Core Types (Functional Style) ---

/** Internal flags for atom types */
export const AtomTypes = {
    Regular: 1,
    Computed: 2,
    Map: 3,
    DeepMap: 4,
} as const;

/** Base structure for atoms that directly hold value and listeners. */
export type AtomWithValue<T> = { // Export AtomWithValue
    /** Internal unique identifier or marker */
    readonly $$id: symbol;
    /** Type marker */
    readonly $$type: number; // Use values from AtomTypes
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
    readonly $$type: typeof AtomTypes.Regular;
    _value: T; // Regular atoms always have an initial value
};

/** Represents a read-only atom (functional style). */
export type ReadonlyAtom<T = any> = AtomWithValue<T> & {
    readonly $$type: typeof AtomTypes.Computed | number; // Allow extension
    _value: T | null; // Readonly might start as null (computed)
};

/** Represents a computed atom's specific properties (functional style). */
export type ComputedAtom<T = any> = ReadonlyAtom<T> & {
    readonly $$type: typeof AtomTypes.Computed;
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
    readonly $$id: symbol;
    readonly $$type: typeof AtomTypes.Map;
    readonly _internalAtom: Atom<T>; // The actual atom holding the object state
};

/** Represents a functional DeepMap Atom structure. */
export type DeepMapAtom<T extends object = any> = {
    readonly $$id: symbol;
    readonly $$type: typeof AtomTypes.DeepMap;
    readonly _internalAtom: Atom<T>; // The actual atom holding the object state
};

/** Union type for any kind of atom. */
export type AnyAtom<T = any> = Atom<T> | ReadonlyAtom<T> | MapAtom<T extends object ? T : any> | DeepMapAtom<T extends object ? T : any>; // Include MapAtom and DeepMapAtom


// --- Internal Helper Functions ---

/**
 * Gets the underlying atom that holds the value and listeners.
 * For Regular and Computed atoms, it's the atom itself.
 * For Map/DeepMap atoms, it's the internal atom.
 * @internal
 */
export function getBaseAtom<T>(atom: AnyAtom<T>): AtomWithValue<T> {
    if (atom.$$type === AtomTypes.Map || atom.$$type === AtomTypes.DeepMap) {
        // Access _internalAtom for MapAtom or DeepMapAtom
        return (atom as MapAtom<T extends object ? T : any> | DeepMapAtom<T extends object ? T : any>)._internalAtom as AtomWithValue<T>;
    }
    // For Atom and ReadonlyAtom (which extend AtomWithValue)
    return atom as AtomWithValue<T>;
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
/**
 * Represents a Task Atom, which wraps an asynchronous function
 * and provides its state (loading, error, data) reactively.
 */
export type TaskAtom<T = any> = {
  readonly $$id: symbol; // Added for consistency, though not strictly needed by current logic
  readonly $$type: number; // Placeholder, Task doesn't have a specific AtomType constant yet
  readonly _stateAtom: Atom<TaskState<T>>;
  readonly _asyncFn: (...args: any[]) => Promise<T>; // Store the async function
};

/** Type definition for the state managed by a Task Atom. */
export type TaskState<T = any> = {
  loading: boolean;
  error?: Error;
  data?: T;
};


// --- Core Functions (Placeholder Comments) ---

// getAtomValue(atom)
// setAtomValue(atom, value)
// subscribeToAtom(atom, listener)

// --- Removed AtomProto ---
// No longer using prototype-based approach.