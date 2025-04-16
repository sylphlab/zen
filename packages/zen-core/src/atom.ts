// Functional atom implementation
import type { Listener, Unsubscribe, AnyAtom, AtomWithValue } from './types'; // Import from types
import type { ComputedAtom } from './computed'; // Import ComputedAtom from computed.ts
import { isComputedAtom } from './typeGuards'; // Import from typeGuards
import { getBaseAtom, notifyListeners } from './internalUtils'; // Import from internalUtils
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
export function get<T>(atom: AnyAtom<T>): T | null { // Return type allows null for computed initial
    // Use type guard to check if it's a computed atom
    if (isComputedAtom(atom)) {
        // Ensure _update exists (it should based on the type) and call it if dirty or initially null
        if ((atom._dirty || atom._value === null)) {
             atom._update(); // Update if dirty or initially null
        }
    }
    // Return the potentially updated value from the base atom
    return getBaseAtom(atom)._value;
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
            atom._setListeners?.forEach(fn => {
                try { fn(value); } catch(e) { console.error(`Error in onSet listener for atom ${String(atom)}:`, e); }
            });
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
    const baseAtom = getBaseAtom(atom); // Get the atom holding listeners/value
    const isFirstListener = !baseAtom._listeners?.size;
    baseAtom._listeners ??= new Set();
    baseAtom._listeners.add(listener);

    // Trigger onStart and onMount if this is the first listener
    if (isFirstListener) {
        // Trigger onMount first (if exists)
        baseAtom._mountListeners?.forEach(fn => {
            try { fn(undefined); } catch(e) { console.error(`Error in onMount listener during first subscribe:`, e); }
        });
        // Clean up mount listeners after first call
        delete baseAtom._mountListeners;

        // Then trigger onStart
        baseAtom._startListeners?.forEach(fn => {
            try { fn(undefined); } catch(e) { console.error(`Error in onStart listener for atom ${String(atom)}:`, e); }
        });
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
        const currentValue = get(atom); // Use renamed get to potentially trigger computed calc
        listener(currentValue!, undefined); // Explicitly pass undefined for initial call
    } catch (e) {
        console.error(`Error in initial listener call for atom ${String(atom)}:`, e);
    }

    return function unsubscribe() {
      const baseAtom = getBaseAtom(atom); // Get the atom holding listeners
      const listeners = baseAtom._listeners;
      if (!listeners?.has(listener)) return; // Already unsubscribed or listener not found

      listeners.delete(listener);

      // Trigger onStop if this was the last listener
      if (!listeners.size) {
        delete baseAtom._listeners; // Clean up Set if empty
        baseAtom._stopListeners?.forEach(fn => {
            try { fn(undefined); } catch(e) { console.error(`Error in onStop listener for atom ${String(atom)}:`, e); }
        });
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
  // Optimize: Only initialize the value. Listener properties will be added on demand.
  const newAtom: Atom<T> = {
    _value: initialValue,
    // Listener properties (e.g., _listeners, _startListeners) are omitted
    // and will be added dynamically by subscribe/event functions if needed.
  };
  // DO NOT trigger onMount immediately after creation anymore.
  // It will be triggered by the first subscribe call.

  return newAtom;
}
