// Functional computed (derived state) implementation.
import {
  Atom,
  ReadonlyAtom,
  Listener,
  Unsubscribe,
  ComputedAtom,
  AnyAtom,
  // Removed AtomTypes
  notifyListeners // Import notifyListeners from core
} from './core';
import { get as getAtomValue, subscribe as subscribeToAtom } from './atom'; // Import updated core functional API

// --- Types --- (Copied from core.ts for clarity, could be imported)
/** Represents an array of source atoms (can be Atom or ReadonlyAtom). */
type Stores = ReadonlyArray<AnyAtom<any>>; // Use AnyAtom

/** Utility type to extract the value types from an array of Stores. */
type StoreValues<S extends Stores> = {
  [K in keyof S]: S[K] extends AnyAtom<infer V> ? V : never
};

// --- Internal Computed Logic ---

/**
 * Recalculates the computed value based on current source values.
 * Updates the internal `_value` and notifies listeners if the value changes.
 * Assumes the atom is already marked as dirty or needs initial calculation.
 * @returns True if the value changed, false otherwise.
 * @internal
 */
function updateComputedValue<T>(atom: ComputedAtom<T>): boolean {
    const srcs = atom._sources;
    const vals = atom._sourceValues;
    const calc = atom._calculation;
    const old = atom._value; // Capture value BEFORE recalculation (could be null)

    // 1. Get current values from all source atoms using the functional API
    for (let i = 0; i < srcs.length; i++) {
        const source = srcs[i];
        if (source) { // Check if source exists
            vals[i] = getAtomValue(source); // Use getAtomValue
        } else {
            vals[i] = undefined; // Or handle missing source appropriately
        }
    }

    // 2. Calculate the new value
    const newValue = calc.apply(null, vals);
    atom._dirty = false; // Mark as clean *after* calculation

    // 3. Check if the value actually changed using the equality function
    // Handle the initial null case for 'old'
    if (old !== null && atom._equalityFn(newValue, old)) {
        return false; // No change, exit early
    }

    // 4. Update internal value
    atom._value = newValue;

    // 5. Value updated. Return true to indicate change.
    // DO NOT notify here. Notification is handled by the caller (e.g., computedSourceChanged or batch end).
    return true; // Value changed
}

/**
 * Handler called when any source atom changes.
 * Marks the computed atom as dirty and triggers an update if active.
 * @internal
 */
function computedSourceChanged<T>(atom: ComputedAtom<T>): void {
    if (atom._dirty) return; // Already dirty, no need to do anything further.

    atom._dirty = true;

    // If there are active listeners, trigger an update and notify *if* the value changed.
    // This propagates the change down the computed chain.
    if (atom._listeners?.size) {
        const oldValue = atom._value; // Store value before potential update
        // Use the internal _update method which calls updateComputedValue
        // Need a way to call updateComputedValue or similar logic here.
        // Let's assume updateComputedValue is sufficient for now.
        const changed = updateComputedValue(atom); // Directly call update logic
        if (changed) {
            // Use the exported notifyListeners from atom.ts
            notifyListeners(atom, atom._value!, oldValue); // Notify downstream listeners
        }
    }
    // If no listeners, we just stay dirty until the next `getAtomValue()`.
}

/** Subscribes a computed atom to all its source atoms. @internal */
function subscribeComputedToSources<T>(atom: ComputedAtom<T>): void {
    if (atom._unsubscribers) return; // Avoid double subscriptions

    const sources = atom._sources;
    atom._unsubscribers = new Array(sources.length);

    // Create a bound handler specific to this computed atom instance
    const onChangeHandler = () => computedSourceChanged(atom);

    for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        if (source) {
            // Subscribe to each source using the functional API
            atom._unsubscribers[i] = subscribeToAtom(source, onChangeHandler);
        }
    }
}

/** Unsubscribes a computed atom from all its source atoms. @internal */
function unsubscribeComputedFromSources<T>(atom: ComputedAtom<T>): void {
    if (!atom._unsubscribers) return; // Nothing to unsubscribe from

    for (const unsub of atom._unsubscribers) {
        unsub?.(); // Call each unsubscribe function
    }
    atom._unsubscribers = undefined; // Clear the array
    atom._dirty = true; // Mark as dirty when inactive, forces recalc on next activation
}


// --- Override getAtomValue for Computed ---
// We need to modify or wrap getAtomValue to handle computed logic.
// This is now handled in atom.ts's getAtomValue by calling updateComputedValue.

// --- Computed Factory (Functional Style) ---

/**
 * Creates a read-only computed atom (functional style).
 * Its value is derived from one or more source atoms using a calculation function.
 *
 * @template T The type of the computed value.
 * @template S Tuple type of the source stores.
 * @param stores An array or tuple of source atoms (AnyAtom).
 * @param calculation A function that takes the current values of the source stores
 *   as arguments and returns the computed value.
 * @param equalityFn Optional function to compare the old and new computed values.
 *   Defaults to `Object.is`. If it returns true, listeners are not notified.
 * @returns A ReadonlyAtom representing the computed value.
 */
export function createComputed<T, S extends Stores>( // Rename factory function
  stores: S,
  calculation: (...values: StoreValues<S>) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is // Default to Object.is
): ReadonlyAtom<T> {

  // Define the structure adhering to ComputedAtom<T> type
  // Optimize: Only initialize essential computed properties. Listeners omitted.
  const computedAtom: ComputedAtom<T> = {
    _value: null, // Start as null
    _dirty: true,
    _sources: stores,
    _sourceValues: new Array(stores.length),
    _calculation: calculation as Function,
    _equalityFn: equalityFn,
    // Listener properties (e.g., _listeners, _startListeners) are omitted
    // _unsubscribers will be added by _subscribeToSources when needed
    // Add back internal methods needed by core logic (get, subscribe)
    _subscribeToSources: () => subscribeComputedToSources(computedAtom),
    _unsubscribeFromSources: () => unsubscribeComputedFromSources(computedAtom),
    _update: () => updateComputedValue(computedAtom),
    // _onChange is not directly called externally, computedSourceChanged handles it
  };

   // DO NOT trigger onMount immediately after creation anymore.
   // It will be triggered by the first subscribe call (handled in atom.ts).

  // The getAtomValue in atom.ts now calls updateComputedValue if dirty.
  // The subscribeToAtom in atom.ts now calls subscribeComputedToSources/unsubscribeComputedFromSources.

  return computedAtom; // Return the computed atom structure
}

// Removed comment block about modifying atom.ts
