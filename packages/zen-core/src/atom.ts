// Functional atom implementation
import type { Listener, Unsubscribe, AnyAtom, AtomValue, AtomWithValue, DeepMapAtom } from './types'; // Removed MapAtom, TaskState, TaskAtom
// Remove duplicate import line
import type { ComputedAtom } from './computed'; // Import ComputedAtom from computed.ts
// Removed import { isComputedAtom } from './typeGuards'; // This line should already be removed, but included for context
// Removed TaskAtom import from './task'
// Removed import from internalUtils
// Removed batch imports

// --- Internal notifyListeners function (moved from internalUtils.ts) ---
/**
 * Notifies all listeners of an atom about a value change.
 * @internal - Exported for use by other modules like computed, deepMap.
 */
export function notifyListeners<A extends AnyAtom>(atom: A, value: AtomValue<A>, oldValue?: AtomValue<A>): void { // Add export
    // Operate directly on the atom, casting to the base structure with the correct value type
    const baseAtom = atom as AtomWithValue<AtomValue<A>>;

    // Notify regular value listeners
    const ls = baseAtom._listeners; // Type is already Set<Listener<AtomValue<A>>> | undefined
    if (ls?.size) {
        // Create a copy for iteration to handle listeners that unsubscribe themselves.
        for (const fn of [...ls]) {
            // Pass oldValue as null if undefined, matching previous logic
            try { fn(value, oldValue ?? null); } catch (e) { console.error(`Error in value listener:`, e); }
        }
    }
}


// --- Type Definition ---
/** Represents a writable atom (functional style). */
export type Atom<T = unknown> = AtomWithValue<T> & { // Default to unknown
    _value: T; // Regular atoms always have an initial value
};

// --- Core Functional API ---

/**
 * Gets the current value of an atom. Provides specific return types based on atom kind.
 * @param atom The atom to read from.
 * @returns The current value.
 */
// Overloads remain largely the same, relying on specific atom types
export function get<T>(atom: Atom<T>): T;
export function get<T>(atom: ComputedAtom<T>): T | null;
// Removed MapAtom overload
export function get<T extends object>(atom: DeepMapAtom<T>): T;
// Removed TaskAtom overload
// General implementation signature using AtomValue
export function get<A extends AnyAtom>(atom: A): AtomValue<A> | null { // Return includes null for computed initial state
    // Use switch for type narrowing and direct value access
    switch (atom._kind) {
        case 'atom':
        // Removed 'map' case
        // Fallthrough intended for 'atom' and 'deepMap'
        case 'deepMap':
            // For these types, _value directly matches AtomValue<A>
            return atom._value;
            // No break needed here as return exits the function
        // Removed 'task' case
        case 'computed': {
            // Explicit cast needed for computed-specific logic
            const computed = atom as ComputedAtom<AtomValue<A>>; // Value type is AtomValue<A>
            if (computed._dirty || computed._value === null) {
                computed._update();
            }
            // Computed value can be null initially
            return computed._value as AtomValue<A> | null;
            // No break needed here as return exits the function
        }
        default: {
            // Handle unknown kind - should be unreachable with AnyAtom
            console.error("Unknown atom kind in get():", atom);
            // Explicit cast to never to satisfy exhaustiveness check
            const _exhaustiveCheck: never = atom as never;
            return null; // Fallback return
        }
    }
}

/**
 * Sets the value of a writable atom. Notifies listeners immediately.
 * @param atom The atom to write to.
 * @param value The new value.
 * @param force If true, notify listeners even if the value is the same.
 */
export function set<T>(atom: Atom<T>, value: T, force = false): void {
    // Assuming the caller passes a valid Atom<T> due to TypeScript typing.
    // Runtime checks were removed for performance/simplicity after $$type removal.

    const oldValue = atom._value;
    if (force || !Object.is(value, oldValue)) {
        // onSet listener logic removed

        atom._value = value;

        // Batching logic removed, notify immediately
        notifyListeners(atom, value, oldValue);
    }
}

/**
 * Subscribes a listener function to an atom's changes.
 * Calls the listener immediately with the current value.
 * Returns an unsubscribe function.
 * @param atom The atom to subscribe to.
 * @param listener The function to call on value changes.
 * @returns A function to unsubscribe the listener.
 */
// General implementation signature using AtomValue
export function subscribe<A extends AnyAtom>(atom: A, listener: Listener<AtomValue<A>>): Unsubscribe {
    // Cast to base structure with correct value type
    const baseAtom = atom as AtomWithValue<AtomValue<A>>;
    const isFirstListener = !baseAtom._listeners?.size;

    // Initialize listeners Set if needed, using the correct value type
    baseAtom._listeners ??= new Set<Listener<AtomValue<A>>>();
    baseAtom._listeners.add(listener); // Add the correctly typed listener

    // Trigger onStart/onMount logic removed
    if (isFirstListener) {
        // If it's a computed atom, trigger its source subscription logic
        if (atom._kind === 'computed') { // Use kind check instead of 'in'
             // Cast to ComputedAtom with the correct value type
             const computed = atom as ComputedAtom<AtomValue<A>>;
             if (typeof computed._subscribeToSources === 'function') {
                computed._subscribeToSources();
             }
        }
    }

    // Initial call to the new listener using the updated get function
    try {
        // get() returns AtomValue<A> | null. Listener expects AtomValue<A>.
        // The cast handles the potential null from computed atoms before their first calculation.
        listener(get(atom) as AtomValue<A>, undefined);
    } catch (e) {
        console.error(`Error in initial listener call for atom ${String(atom)}:`, e);
    }

    return function unsubscribe() {
      // Cast to base structure with correct value type
      const baseAtom = atom as AtomWithValue<AtomValue<A>>;
      const listeners = baseAtom._listeners; // Type is already Set<Listener<AtomValue<A>>> | undefined

      // Check if listener exists before deleting
      if (!listeners?.has(listener)) return;

      listeners.delete(listener);

      // Trigger onStop logic removed
      if (!listeners.size) {
        delete baseAtom._listeners; // Clean up Set if empty
        // If it's a computed atom, trigger its source unsubscription logic
        if (atom._kind === 'computed') { // Use kind check instead of 'in'
            // Cast to ComputedAtom with the correct value type
            const computed = atom as ComputedAtom<AtomValue<A>>;
             if (typeof computed._unsubscribeFromSources === 'function') {
                computed._unsubscribeFromSources();
             }
        }
      }
    };
}


// --- Atom Factory (Functional Style) ---

/**
 * Creates a new writable atom (functional style).
 * @param initialValue The initial value of the atom.
 * @returns An Atom instance.
 */
export function atom<T>(initialValue: T): Atom<T> { // Rename createAtom to atom
  // Optimize: Only initialize essential properties. Listeners added on demand.
  const newAtom: Atom<T> = {
    _kind: 'atom', // Set kind
    _value: initialValue,
    // Listener properties (e.g., _listeners, _startListeners) are omitted
    // and will be added dynamically by subscribe/event functions if needed.
  };
  // onMount logic removed

  return newAtom;
}
