// Functional atom implementation
import type { Listener, Unsubscribe, AnyAtom, AtomWithValue, TaskState, TaskAtom } from './types'; // Import from types (including TaskAtom)
import type { ComputedAtom } from './computed'; // Import ComputedAtom from computed.ts
import { isComputedAtom } from './typeGuards'; // Import from typeGuards
// Removed TaskAtom import from './task'
import { notifyListeners } from './internalUtils'; // Import from internalUtils (getBaseAtom removed)
import { queueAtomForBatch, batchDepth } from './batch'; // Import batch helpers AND batchDepth (Removed isInBatch)

// --- Type Definition ---
/** Represents a writable atom (functional style). */
export type Atom<T = any> = AtomWithValue<T> & {
    _value: T; // Regular atoms always have an initial value
};

// --- Core Functional API ---

/**
 * Gets the current value of an atom.
 * @param atom The atom to read from.
 * @returns The current value.
 */
export function get<T>(atom: AnyAtom<T>): T | TaskState<any> | null { // Adjusted return type for TaskState
    // Dispatch based on atom kind for potential optimization
    if ('_kind' in atom) { // Check if _kind exists (basic atoms, computed)
        switch (atom._kind) {
            case 'computed':
                const computed = atom as ComputedAtom<T>;
                if (computed._dirty || computed._value === null) {
                    computed._update();
                }
                return computed._value;
            case 'atom':
                return (atom as Atom<T>)._value;
            // For map/deepMap/taskState, _kind is on the internal atom.
            // Fall through to getBaseAtom logic below.
        }
    }

    // Fallback for Map, DeepMap, Task, or unknown
    // Operate directly on the atom as it now includes AtomWithValue properties
    if (atom._kind === 'task') {
        // TaskAtom directly holds TaskState in _value
        return (atom as AtomWithValue<TaskState<any>>)._value;
    }
    // For Map, DeepMap, or unknown fallback
    return (atom as AtomWithValue<T>)._value; // Assume AtomWithValue structure
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
export function subscribe<T>(atom: AnyAtom<T>, listener: Listener<T>): Unsubscribe {
    // Operate directly on the atom
    const baseAtom = atom as AtomWithValue<any>; // Cast for listener access
    const isFirstListener = !baseAtom._listeners?.size;
    baseAtom._listeners ??= new Set();
    baseAtom._listeners.add(listener as Listener<any>); // Cast listener type

    // Trigger onStart and onMount if this is the first listener
    if (isFirstListener) {
        // Trigger onMount first (if exists)
        const mountLs = baseAtom._mountListeners;
        if (mountLs?.size) { // Use size for Set
            for (const fn of mountLs) { // Iterate Set
                try { fn(undefined); } catch(e) { console.error(`Error in onMount listener during first subscribe:`, e); }
            }
        }
        // Clean up mount listeners after first call
        delete baseAtom._mountListeners;

        // Then trigger onStart
        const startLs = baseAtom._startListeners;
        if (startLs?.size) { // Use size for Set
            for (const fn of startLs) { // Iterate Set
                try { fn(undefined); } catch(e) { console.error(`Error in onStart listener for atom ${String(atom)}:`, e); }
            }
        }
        // If it's a computed atom, trigger its source subscription logic
        if (isComputedAtom(atom)) { // Use type guard
             const computed = atom as ComputedAtom<T>; // Explicit cast after type guard
             // Ensure the method exists before calling
             if (typeof computed._subscribeToSources === 'function') {
                computed._subscribeToSources(); // Use the explicitly cast 'computed' variable
             }
        }
    }
    // onMount is now handled above on first listener

    // Initial call to the new listener
    // The very first value notification should always have `undefined` as oldValue.
    try {
        const currentValue = get(atom); // Use updated get function
        // Cast to T, assuming listener matches the atom's expected value type.
        // TaskState is handled by subscribeToTask which provides the correct listener type.
        listener(currentValue as T, undefined); // Explicitly pass undefined for initial call
    } catch (e) {
        console.error(`Error in initial listener call for atom ${String(atom)}:`, e);
    }

    return function unsubscribe() {
      // Operate directly on the atom
      const baseAtom = atom as AtomWithValue<any>; // Cast for listener access
      const listeners = baseAtom._listeners;
      if (!listeners?.has(listener)) return; // Already unsubscribed or listener not found

      listeners.delete(listener); // Use Set delete

      // Trigger onStop if this was the last listener
      if (!listeners.size) { // Use Set size
        delete baseAtom._listeners; // Clean up Set if empty
        const stopLs = baseAtom._stopListeners;
        if (stopLs?.size) { // Use size for Set
            for (const fn of stopLs) { // Iterate Set
                try { fn(undefined); } catch(e) { console.error(`Error in onStop listener for atom ${String(atom)}:`, e); }
            }
        }
        // If it's a computed atom, trigger its source unsubscription logic
        if (isComputedAtom(atom)) { // Use type guard
            const computed = atom as ComputedAtom<T>; // Explicit cast after type guard
             // Ensure the method exists before calling
             if (typeof computed._unsubscribeFromSources === 'function') {
                computed._unsubscribeFromSources(); // Use the explicitly cast 'computed' variable
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
