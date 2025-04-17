// Functional atom implementation
import type { Listener, Unsubscribe, AnyAtom, AtomValue, AtomWithValue, TaskState, TaskAtom, MapAtom, DeepMapAtom } from './types'; // Import AtomValue
// Remove duplicate import line
import type { ComputedAtom } from './computed'; // Import ComputedAtom from computed.ts
// Removed import { isComputedAtom } from './typeGuards'; // This line should already be removed, but included for context
// Removed TaskAtom import from './task'
import { notifyListeners } from './internalUtils'; // Import from internalUtils (getBaseAtom removed)
import { queueAtomForBatch, batchDepth } from './batch'; // Import batch helpers AND batchDepth (Removed isInBatch)

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
export function get<T extends object>(atom: MapAtom<T>): T;
export function get<T extends object>(atom: DeepMapAtom<T>): T;
export function get<T, Args extends unknown[]>(atom: TaskAtom<T, Args>): TaskState<T>; // Use TaskAtom directly
// General implementation signature using AtomValue
export function get<A extends AnyAtom>(atom: A): AtomValue<A> | null { // Return includes null for computed initial state
    // Use switch for type narrowing and direct value access
    switch (atom._kind) {
        case 'atom':
        case 'map':
        case 'deepMap':
        case 'task':
            // For these types, _value directly matches AtomValue<A>
            return atom._value;
        case 'computed': {
            // Explicit cast needed for computed-specific logic
            const computed = atom as ComputedAtom<AtomValue<A>>; // Value type is AtomValue<A>
            if (computed._dirty || computed._value === null) {
                computed._update();
            }
            // Computed value can be null initially
            return computed._value as AtomValue<A> | null;
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
 * Sets the value of a writable atom.
 * @param atom The atom to write to.
 * @param value The new value.
 * @param force If true, notify listeners even if the value is the same.
 */
export function set<T>(atom: Atom<T>, value: T, force = false): void {
    // Assuming the caller passes a valid Atom<T> due to TypeScript typing.
    // Runtime checks were removed for performance/simplicity after $$type removal.

    const oldValue = atom._value;
    if (force || !Object.is(value, oldValue)) {
        // Trigger onSet listeners BEFORE setting value, ONLY if not in batch
        // Directly check batchDepth from batch.ts
        if (batchDepth <= 0) { // Check if NOT in batch (depth is 0 or less)
            const setLs = atom._setListeners;
            if (setLs?.size) { // Use size for Set
                for (const fn of setLs) { // Iterate Set
                    try { fn(value); } catch(e) { console.error(`Error in onSet listener for atom ${String(atom)}:`, e); }
                }
            }
        }

        atom._value = value;

        // Check if currently in a batch using the same direct check
        if (batchDepth > 0) {
            queueAtomForBatch(atom, oldValue); // Queue for later notification
        } else {
            // Outside batch: notify immediately.
            notifyListeners(atom, value, oldValue);
        }
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

    // Trigger onStart and onMount if this is the first listener
    if (isFirstListener) {
        // Trigger onMount first (if exists)
        const mountLs = baseAtom._mountListeners;
        if (mountLs?.size) {
            for (const fn of mountLs) {
                try { fn(undefined); } catch(e) { console.error(`Error in onMount listener during first subscribe:`, e); }
            }
        }
        delete baseAtom._mountListeners; // Clean up mount listeners

        // Then trigger onStart
        const startLs = baseAtom._startListeners;
        if (startLs?.size) {
            for (const fn of startLs) {
                try { fn(undefined); } catch(e) { console.error(`Error in onStart listener for atom ${String(atom)}:`, e); }
            }
        }

        // If it's a computed atom, trigger its source subscription logic
        // If it's a computed atom, trigger its source subscription logic (Inline check)
        if ('_calculation' in atom) {
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

      // Trigger onStop if this was the last listener
      if (!listeners.size) {
        delete baseAtom._listeners; // Clean up Set if empty
        const stopLs = baseAtom._stopListeners;
        if (stopLs?.size) {
            for (const fn of stopLs) {
                try { fn(undefined); } catch(e) { console.error(`Error in onStop listener for atom ${String(atom)}:`, e); }
            }
        }
        // If it's a computed atom, trigger its source unsubscription logic
        // If it's a computed atom, trigger its source unsubscription logic (Inline check)
        if ('_calculation' in atom) {
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
  // DO NOT trigger onMount immediately after creation anymore.
  // It will be triggered by the first subscribe call.

  return newAtom;
}
