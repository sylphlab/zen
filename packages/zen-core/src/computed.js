import { notifyListeners } from './atom';
// Removed unused StoreValues type
// --- Internal Computed Logic ---
/**
 * Recalculates the computed value based on current source values.
 * Updates the internal `_value` and notifies listeners if the value changes.
 * Assumes the atom is already marked as dirty or needs initial calculation.
 * @returns True if the value changed, false otherwise.
 * @internal
 */
function updateComputedValue(atom) {
    const srcs = atom._sources;
    // If there are no sources, the value cannot be computed.
    if (!srcs || srcs.length === 0) {
        atom._dirty = true; // Remain dirty
        return false;
    }
    const vals = atom._sourceValues;
    const calc = atom._calculation;
    const old = atom._value; // Capture value BEFORE recalculation (could be null)
    // 1. Get current values from all source atoms and check readiness
    let computedCanUpdate = true; // Flag to track if all dependencies are ready
    for (let i = 0; i < srcs.length; i++) {
        const source = srcs[i];
        if (!source) {
            vals[i] = undefined;
            continue; // Skip missing sources
        }
        let sourceValue;
        switch (source._kind) {
            case 'atom':
            case 'map': // Assume map/deepMap values are read directly
            case 'deepMap':
                sourceValue = source._value;
                break;
            case 'computed': {
                const computedSource = source;
                if (computedSource._dirty || computedSource._value === null) {
                    // Try to update the computed source synchronously
                    computedSource._update(); // This might recursively call updateComputedValue
                    // If it's *still* dirty or null after update attempt, computed cannot update now
                    if (computedSource._dirty || computedSource._value === null) {
                        computedCanUpdate = false;
                    }
                }
                sourceValue = computedSource._value; // Read value after potential update
                break;
            }
            case 'batched': {
                const batchedSource = source;
                // If a batched dependency is dirty, computed cannot update synchronously
                if (batchedSource._dirty) {
                    computedCanUpdate = false;
                }
                // Read the current value, might be null or stale if dirty
                sourceValue = batchedSource._value;
                break;
            }
            // No default needed for AnyAtom union
        }
        // If computed cannot update (due to dirty/null computed or dirty batched dependency), stop collecting values
        if (!computedCanUpdate) {
            break;
        }
        vals[i] = sourceValue;
    }
    // If dependencies weren't ready (e.g., dirty batched dependency, or nested computed failed update),
    // mark computed as dirty and return false (no change).
    // Let the calculation function handle potentially null values if needed.
    if (!computedCanUpdate) {
        atom._dirty = true;
        return false;
    }
    // Note: We proceed even if some vals are null, assuming null is a valid state.
    // The calculation function itself should handle null inputs if necessary.
    // *** ADDED CHECK: Ensure all collected values are not undefined before calculating ***
    if (vals.some(v => v === undefined)) {
        atom._dirty = true; // Remain dirty if any source value is still undefined
        return false;
    }
    // *** END ADDED CHECK ***
    // 2. Dependencies are ready, proceed with calculation
    const newValue = calc(...vals); // vals are now guaranteed non-null AND non-undefined
    atom._dirty = false; // Mark as clean *after* successful calculation
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
function computedSourceChanged(atom) {
    if (atom._dirty)
        return; // Already dirty, no need to do anything further.
    atom._dirty = true;
    // If there are active listeners, trigger an update and notify *if* the value changed.
    // This propagates the change down the computed chain.
    if (atom._listeners?.size) {
        const oldValue = atom._value; // Store value before potential update
        // Use the internal _update method which calls updateComputedValue
        const changed = updateComputedValue(atom); // Directly call update logic
        if (changed) {
            // Use the exported notifyListeners
            try {
                // Cast to AnyAtom for notifyListeners
                notifyListeners(atom, atom._value, oldValue); // Notify downstream listeners
            }
            catch (e) {
                console.error(`Error notifying listeners for computed atom ${String(atom)}:`, e);
            }
        }
    }
    // If no listeners, we just stay dirty until the next `getAtomValue()`.
}
/** Subscribes a computed atom to all its source atoms. @internal */
function subscribeComputedToSources(atom) {
    if (atom._unsubscribers)
        return; // Avoid double subscriptions
    const sources = atom._sources;
    atom._unsubscribers = new Array(sources.length);
    // Create a bound handler specific to this computed atom instance
    const onChangeHandler = () => computedSourceChanged(atom);
    for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        if (source) {
            // Inline subscribeToAtom logic to avoid overload resolution issues
            const baseSource = source; // Cast to unknown
            const isFirstSourceListener = !baseSource._listeners?.size;
            baseSource._listeners ??= new Set();
            baseSource._listeners.add(onChangeHandler); // Add the computed's handler
            // Trigger source's onStart/onMount logic removed
            if (isFirstSourceListener) {
                // If the source is itself computed, trigger its source subscription
                if (source._kind === 'computed') { // Check kind directly
                    const computedSource = source; // Cast
                    if (typeof computedSource._subscribeToSources === 'function') {
                        computedSource._subscribeToSources();
                    }
                }
            }
            // Don't call the listener immediately here, computed handles initial calc
            // Store the unsubscribe logic for this specific source
            atom._unsubscribers[i] = () => {
                const baseSrc = source; // Cast to unknown
                const srcListeners = baseSrc._listeners;
                if (!srcListeners?.has(onChangeHandler))
                    return;
                srcListeners.delete(onChangeHandler);
                if (!srcListeners.size) {
                    delete baseSrc._listeners;
                    // onStop logic removed
                    if (source._kind === 'computed') {
                        const computedSource = source;
                        if (typeof computedSource._unsubscribeFromSources === 'function') {
                            computedSource._unsubscribeFromSources();
                        }
                    }
                }
            };
        }
    }
}
/** Unsubscribes a computed atom from all its source atoms. @internal */
function unsubscribeComputedFromSources(atom) {
    if (!atom._unsubscribers)
        return; // Nothing to unsubscribe from
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
 *   as individual arguments and returns the computed value.
 * @param equalityFn Optional function to compare the old and new computed values.
 *   Defaults to `Object.is`. If it returns true, listeners are not notified.
 * @returns A ReadonlyAtom representing the computed value.
 */
export function computed(// Allow single atom or array
stores, 
// Change signature to accept unknown[] for compatibility with internal call
calculation, equalityFn = Object.is // Default to Object.is
) {
    // Normalize stores input to always be an array
    const storesArray = Array.isArray(stores) ? stores : [stores];
    // Define the structure adhering to ComputedAtom<T> type
    // Optimize: Only initialize essential computed properties. Listeners omitted.
    const computedAtom = {
        _kind: 'computed', // Set kind
        _value: null, // Start as null
        _dirty: true,
        _sources: [...storesArray], // Use spread syntax on the normalized array
        _sourceValues: new Array(storesArray.length), // Use length of normalized array
        // Store the calculation function as provided (expecting spread args)
        _calculation: calculation, // No cast needed now
        _equalityFn: equalityFn,
        // Listener properties (e.g., _listeners, _startListeners) are omitted
        // _unsubscribers will be added by _subscribeToSources when needed
        // Add back internal methods needed by core logic (get, subscribe)
        _subscribeToSources: () => subscribeComputedToSources(computedAtom),
        _unsubscribeFromSources: () => unsubscribeComputedFromSources(computedAtom),
        _update: () => updateComputedValue(computedAtom),
        // _onChange is not directly called externally, computedSourceChanged handles it
    };
    // onMount logic removed
    // The getAtomValue in atom.ts now calls updateComputedValue if dirty.
    // The subscribeToAtom in atom.ts now calls subscribeComputedToSources/unsubscribeComputedFromSources.
    return computedAtom; // Return the computed atom structure
}
// Note: getAtomValue and subscribeToAtom logic in atom.ts handles computed atom specifics.
