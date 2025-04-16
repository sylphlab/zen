// Functional atom implementation
import type { Listener, Unsubscribe, AnyAtom, AtomWithValue, TaskState, TaskAtom, MapAtom, DeepMapAtom } from './types'; // Import from types (including TaskAtom, MapAtom, DeepMapAtom)
// Remove duplicate import line
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
 * Gets the current value of an atom. Provides specific return types based on atom kind.
 * @param atom The atom to read from.
 * @returns The current value.
 */
// Overloads for specific atom types
export function get<T>(atom: Atom<T>): T;
export function get<T>(atom: ComputedAtom<T>): T | null; // Computed can be null initially
export function get<T extends object>(atom: MapAtom<T>): T;
export function get<T extends object>(atom: DeepMapAtom<T>): T;
export function get<T>(atom: TaskAtom<T>): TaskState<T>;
// General implementation signature (covers AnyAtom and allows internal logic)
export function get<T>(atom: AnyAtom<T>): T | TaskState<unknown> | object | null {
    // Use switch for type narrowing and direct value access
    switch (atom._kind) {
        case 'atom':
            // Type is narrowed to Atom<T>, _value is T
            return atom._value;
        case 'computed':
            // Explicit cast needed despite switch
            const computed = atom as ComputedAtom<T>;
            if (computed._dirty || computed._value === null) {
                computed._update();
            }
            return computed._value;
        case 'map':
        case 'deepMap':
            // Type is narrowed to MapAtom<any> | DeepMapAtom<any>
            // Value is object | null, but should always be object for these types
            // Overload ensures atom._value is T (object)
            return atom._value;
        case 'task':
            // Type is narrowed to TaskAtom<T>
            // Overload ensures atom._value is TaskState<T>
            return atom._value;
        default:
            // Handle unknown kind - should not happen with AnyAtom
            // Fallback to satisfy TS, though ideally unreachable
            console.error("Unknown atom kind in get():", atom);
            const exhaustiveCheck: never = atom; // Ensure all cases are handled
            return null;
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
// Overloads for specific atom types
export function subscribe<T>(atom: Atom<T>, listener: Listener<T>): Unsubscribe;
export function subscribe<T>(atom: ComputedAtom<T>, listener: Listener<T | null>): Unsubscribe; // Computed can be null
export function subscribe<T extends object>(atom: MapAtom<T>, listener: Listener<T>): Unsubscribe;
export function subscribe<T extends object>(atom: DeepMapAtom<T>, listener: Listener<T>): Unsubscribe;
export function subscribe<T>(atom: TaskAtom<T>, listener: Listener<TaskState<T>>): Unsubscribe;
// General implementation signature
export function subscribe<T>(atom: AnyAtom<T>, listener: Listener<any>): Unsubscribe { // Use Listener<any> for implementation flexibility
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
        // Replicate get() logic here to avoid nested overload resolution issues
        let currentValue: T | TaskState<unknown> | object | null;
        switch (atom._kind) {
            case 'atom':
                currentValue = atom._value;
                break;
            case 'computed':
                const computed = atom as ComputedAtom<T>;
                if (computed._dirty || computed._value === null) {
                    computed._update();
                }
                currentValue = computed._value;
                break;
            case 'map':
            case 'deepMap':
                currentValue = atom._value; // Overloads ensure this is T (object)
                break;
            case 'task':
                currentValue = atom._value; // Overloads ensure this is TaskState<T>
                break;
            default:
                 // Should be unreachable due to AnyAtom type
                 console.error("Unknown atom kind in subscribe initial call:", atom);
                 const exhaustiveCheck: never = atom;
                 currentValue = null; // Fallback
                 break;
        }
        // The subscribe overloads ensure the listener type matches currentValue type now.
        listener(currentValue, undefined);
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
