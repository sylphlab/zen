// Functional atom implementation
import type { Listener, Unsubscribe, AnyAtom, AtomValue, AtomWithValue, MapAtom, DeepMapAtom, TaskAtom, TaskState } from './types'; // Add MapAtom, TaskAtom, TaskState back
// Remove duplicate import line
import type { ComputedAtom } from './computed';
import type { BatchedAtom } from './batched'; // Import BatchedAtom
// Removed import { isComputedAtom } from './typeGuards';
// Removed TaskAtom import from './task'
// Removed import from internalUtils

// --- Batching Internals (moved from batch.ts) ---
/** Tracks the nesting depth of batch calls. @internal */
export let batchDepth = 0; // Export for map/deepMap
/** Stores atoms that have changed within the current batch, along with their original value. */
const batchQueue = new Map<Atom<unknown>, unknown>(); // Use unknown for both key and value

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
            // Pass oldValue directly (can be undefined for initial calls)
            try { fn(value, oldValue); } catch (e) { console.error(`Error in value listener:`, e); }
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
export function get<T extends object>(atom: MapAtom<T>): T; // Add MapAtom overload back
export function get<T extends object>(atom: DeepMapAtom<T>): T;
export function get<T>(atom: TaskAtom<T>): TaskState<T>; // Add TaskAtom overload back
// General implementation signature using AtomValue
export function get<A extends AnyAtom>(atom: A): AtomValue<A> | null { // Return includes null for computed initial state
    // Use switch for type narrowing and direct value access
    switch (atom._kind) {
        case 'atom':
        case 'map': // Add 'map' case back
        case 'deepMap':
        case 'task': // Add 'task' case back
            // For these types, _value directly matches AtomValue<A>
            // Cast needed as TS struggles with inference within generic function.
            return atom._value as AtomValue<A>;
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
        // Add case for batched, although get() shouldn't trigger its update
        case 'batched': {
             const batched = atom as BatchedAtom<AtomValue<A>>;
             // Batched atoms update via microtask, just return current value
             return batched._value as AtomValue<A> | null;
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

        // Use local batching logic (queueAtomForBatch defined below)
        if (batchDepth > 0) {
            queueAtomForBatch(atom, oldValue);
        } else {
            // Cast needed to satisfy notifyListeners<A extends AnyAtom> parameter.
            notifyListeners(atom as AnyAtom, value, oldValue); // Notify immediately if not in batch
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

    // Trigger onStart/onMount logic removed
    if (isFirstListener) {
        // If it's a computed or batched atom, trigger its source subscription logic
        if (atom._kind === 'computed' || atom._kind === 'batched') {
             // Cast to the appropriate type to access the method
             const dependentAtom = atom as (ComputedAtom<AtomValue<A>> | BatchedAtom<AtomValue<A>>);
             if (typeof dependentAtom._subscribeToSources === 'function') {
                dependentAtom._subscribeToSources();
             }
        }
    }

    // Call listener immediately with the current value.
    // Use get() to ensure computed atoms calculate their initial value if needed.
    try {
        // Use type assertion `as any` because TS struggles to narrow `A` to match a specific `get` overload here.
        // The `get` function's internal switch statement handles the different atom kinds correctly.
        const initialValue = get(atom as any); // This handles computed updates
        // Pass undefined as oldValue for the initial call
        (listener as Listener<any>)(initialValue, undefined);
    } catch (e) {
        console.error(`Error in initial listener call (sync) for atom ${String(atom)}:`, e);
        // Optionally re-throw or handle differently
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
        // If it's a computed or batched atom, trigger its source unsubscription logic
        if (atom._kind === 'computed' || atom._kind === 'batched') {
            // Cast to the appropriate type to access the method
            const dependentAtom = atom as (ComputedAtom<AtomValue<A>> | BatchedAtom<AtomValue<A>>);
             if (typeof dependentAtom._unsubscribeFromSources === 'function') {
                dependentAtom._unsubscribeFromSources();
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


// --- Batching Functions (moved from batch.ts) ---

/**
 * Checks if the code is currently executing within a `batch()` call.
 * @internal
 */
export function isInBatch(): boolean { // Export for potential external use? Keep internal for now.
  return batchDepth > 0;
}

/**
 * Queues an atom for notification at the end of the batch.
 * Stores the original value before the batch started if it's the first change for this atom in the batch.
 * @internal
 */
 // Export for map/deepMap
export function queueAtomForBatch<T>(atom: Atom<T>, originalValue: T): void {
  // Only store the original value the *first* time an atom is queued in a batch.
    if (!batchQueue.has(atom as Atom<unknown>)) { // Cast to unknown
      batchQueue.set(atom as Atom<unknown>, originalValue); // Cast to unknown
  }
}

/**
 * Executes a function, deferring all atom listener notifications until the function completes.
 * Batches can be nested; notifications only run when the outermost batch finishes.
 * @param fn The function to execute within the batch.
 * @returns The return value of the executed function.
 */
export function batch<T>(fn: () => T): T { // Export batch
  batchDepth++;

  let errorOccurred = false;
  let result: T;
  // Stores details of atoms that actually changed value for final notification.
    const changesToNotify: { atom: Atom<unknown>; value: unknown; oldValue: unknown }[] = []; // Use unknown for atom type

  try {
      result = fn(); // Execute the provided function
  } catch (e) {
      errorOccurred = true;
      throw e; // Re-throw the error after cleanup (in finally)
  } finally {
      batchDepth--;

      // Only process queue if this is the outermost batch call
      if (batchDepth === 0) {
          // --- Start Critical Section: Process Queue ---
          try {
              // Only collect changes if the batch function executed without errors.
              if (!errorOccurred && batchQueue.size > 0) {
                  // Iterate directly over the map entries
                  for (const [atom, originalValueBeforeBatch] of batchQueue.entries()) {
                      const currentValue = atom._value; // Get the final value after the batch

                      // Only queue for notification if the value actually changed from before the batch
                      if (!Object.is(currentValue, originalValueBeforeBatch)) {
                          changesToNotify.push({ atom: atom, value: currentValue, oldValue: originalValueBeforeBatch });
                      }
                  }
              }
          } finally {
              // **Crucially, always clear the queue** after processing or if an error occurred.
              batchQueue.clear();
          }
          // --- End Critical Section ---
      }
  }

  // --- Perform Notifications ---
  // This happens *after* the finally block.
  // Only notify if it was the outermost batch call and no error occurred during fn().
  if (batchDepth === 0 && !errorOccurred && changesToNotify.length > 0) {
      for (const change of changesToNotify) {
          try {
              // Call the local notifyListeners function directly.
              notifyListeners(change.atom, change.value, change.oldValue);
          } catch (err) {
              console.error(`Error during batched notification for atom ${String(change.atom)}:`, err);
          }
      }
  }

  // Return the result of the batch function.
  // Non-null assertion is safe because errors are re-thrown.
  return result!;
}
