// Removed import { isComputedAtom } from './typeGuards';
// Removed TaskAtom import from './task'
// Removed import from internalUtils
// --- Batching Internals (moved from batch.ts) ---
/** Tracks the nesting depth of batch calls. @internal */
export let batchDepth = 0; // Export for map/deepMap
/** Stores atoms that have changed within the current batch, along with their original value. */
const batchQueue = new Map(); // Use unknown for both key and value
// --- Internal notifyListeners function (moved from internalUtils.ts) ---
/**
 * Notifies all listeners of an atom about a value change.
 * @internal - Exported for use by other modules like computed, deepMap.
 */
export function notifyListeners(atom, value, oldValue) {
    // Add export
    // Operate directly on the atom, casting to the base structure with the correct value type
    const baseAtom = atom;
    // Notify regular value listeners
    const ls = baseAtom._listeners; // Type is already Set<Listener<AtomValue<A>>> | undefined
    if (ls?.size) {
        // Create a copy for iteration to handle listeners that unsubscribe themselves.
        for (const fn of [...ls]) {
            // Pass oldValue directly (can be undefined for initial calls)
            try {
                fn(value, oldValue);
            }
            catch (_e) { }
        }
    }
    // Notify onNotify listeners AFTER value listeners
    const notifyLs = baseAtom._notifyListeners;
    if (notifyLs?.size) {
        for (const fn of [...notifyLs]) {
            try {
                fn(value);
            }
            catch (_e) { } // Pass new value
        }
    }
}
// General implementation signature using AtomValue
export function get(atom) {
    // Return includes null for computed initial state
    // Use switch for type narrowing and direct value access
    switch (atom._kind) {
        case 'atom':
        case 'map': // Add 'map' case back
        case 'deepMap':
        case 'task': // Add 'task' case back
            // For these types, _value directly matches AtomValue<A>
            // Cast needed as TS struggles with inference within generic function.
            return atom._value;
        // No break needed here as return exits the function
        // Removed 'task' case
        case 'computed': {
            // Explicit cast needed for computed-specific logic
            const computed = atom; // Value type is AtomValue<A>
            if (computed._dirty || computed._value === null) {
                computed._update();
            }
            // Computed value can be null initially
            return computed._value;
            // No break needed here as return exits the function
        }
        // Add case for batched, although get() shouldn't trigger its update
        case 'batched': {
            const batched = atom;
            // Batched atoms update via microtask, just return current value
            return batched._value;
        }
        default: {
            // Explicit cast to never to satisfy exhaustiveness check
            const _exhaustiveCheck = atom;
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
export function set(atom, value, force = false) {
    // Assuming the caller passes a valid Atom<T> due to TypeScript typing.
    // Runtime checks were removed for performance/simplicity after $$type removal.
    const oldValue = atom._value;
    if (force || !Object.is(value, oldValue)) {
        // Call onSet listeners BEFORE value change, only outside batch
        if (batchDepth <= 0) {
            const setLs = atom._setListeners;
            if (setLs?.size) {
                for (const fn of setLs) {
                    try {
                        fn(value); // Pass the NEW value
                    }
                    catch (_e) { }
                }
            }
        }
        atom._value = value;
        // Use local batching logic (queueAtomForBatch defined below)
        if (batchDepth > 0) {
            queueAtomForBatch(atom, oldValue);
        }
        else {
            // Cast needed to satisfy notifyListeners<A extends AnyAtom> parameter.
            notifyListeners(atom, value, oldValue); // Notify immediately if not in batch
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
export function subscribe(atom, listener) {
    // Cast to base structure with correct value type
    const baseAtom = atom;
    const isFirstListener = !baseAtom._listeners?.size;
    // Initialize listeners Set if needed, using the correct value type
    baseAtom._listeners ??= new Set();
    baseAtom._listeners.add(listener); // Add the correctly typed listener
    // Trigger onStart/onMount logic removed
    if (isFirstListener) {
        // Trigger onMount listeners
        const mountLs = baseAtom._mountListeners;
        if (mountLs?.size) {
            baseAtom._mountCleanups ??= new Map(); // Initialize cleanup map if needed
            for (const fn of mountLs) {
                try {
                    const cleanup = fn(); // Call listener
                    if (typeof cleanup === 'function') {
                        baseAtom._mountCleanups.set(fn, cleanup); // Store cleanup fn
                    }
                    else {
                        baseAtom._mountCleanups.set(fn, undefined); // Store undefined if no cleanup
                    }
                }
                catch (_e) { }
            }
        }
        // Trigger onStart listeners
        const startLs = baseAtom._startListeners;
        if (startLs?.size) {
            // Pass the current value (might be null for computed initial)
            // Use get() to ensure computed is calculated if needed for the listener
            // biome-ignore lint/suspicious/noExplicitAny: TS struggles with generic overload resolution here
            const currentValue = get(atom);
            for (const fn of startLs) {
                try {
                    fn(currentValue);
                }
                catch (_e) { }
            }
        }
        // If it's a computed or batched atom, trigger its source subscription logic
        if (atom._kind === 'computed' || atom._kind === 'batched') {
            // Cast to the appropriate type to access the method
            const dependentAtom = atom;
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
        // biome-ignore lint/suspicious/noExplicitAny: TS struggles with generic overload resolution here
        const initialValue = get(atom); // Reverted: Use generic type A, removed 'as any'
        // Pass undefined as oldValue for the initial call
        // biome-ignore lint/suspicious/noExplicitAny: Listener type requires any here due to complex generic
        listener(initialValue, undefined); // Reverted: Removed 'as Listener<any>'
    }
    catch (_e) {
        // Optionally re-throw or handle differently
    }
    return function unsubscribe() {
        // Cast to base structure with correct value type
        const baseAtom = atom;
        const listeners = baseAtom._listeners; // Type is already Set<Listener<AtomValue<A>>> | undefined
        // Check if listener exists before deleting
        if (!listeners?.has(listener))
            return;
        listeners.delete(listener);
        // Trigger onStop logic removed
        if (!listeners.size) {
            baseAtom._listeners = undefined; // Clean up Set if empty
            // Trigger onStop listeners if this was the last value listener
            const stopLs = baseAtom._stopListeners;
            if (stopLs?.size) {
                for (const fn of stopLs) {
                    try {
                        fn();
                    }
                    catch (_e) { }
                }
            }
            // Trigger onMount cleanups if this was the last listener
            const cleanups = baseAtom._mountCleanups;
            if (cleanups?.size) {
                for (const cleanupFn of cleanups.values()) {
                    if (typeof cleanupFn === 'function') {
                        try {
                            cleanupFn();
                        }
                        catch (_e) { }
                    }
                }
                baseAtom._mountCleanups = undefined; // Clear the map after running cleanups
            }
            // If it's a computed or batched atom, trigger its source unsubscription logic
            if (atom._kind === 'computed' || atom._kind === 'batched') {
                // Cast to the appropriate type to access the method
                const dependentAtom = atom;
                if (typeof dependentAtom._unsubscribeFromSources === 'function') {
                    dependentAtom._unsubscribeFromSources();
                }
            }
        }
    };
}
// --- Atom Factory (Functional Style) ---
/**
 * Creates a new writable zen instance (functional style).
 * @param initialValue The initial value of the zen instance.
 * @returns An Atom instance. // Keep return type as Atom for now
 */
export function zen(initialValue) {
    // Optimize: Only initialize essential properties. Listeners added on demand.
    const newAtom = {
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
export function isInBatch() {
    // Export for potential external use? Keep internal for now.
    return batchDepth > 0;
}
/**
 * Queues an atom for notification at the end of the batch.
 * Stores the original value before the batch started if it's the first change for this atom in the batch.
 * @internal
 */
// Export for map/deepMap
export function queueAtomForBatch(atom, originalValue) {
    // Only store the original value the *first* time an atom is queued in a batch.
    if (!batchQueue.has(atom)) {
        // Cast to unknown
        batchQueue.set(atom, originalValue); // Cast to unknown
    }
}
/**
 * Executes a function, deferring all atom listener notifications until the function completes.
 * Batches can be nested; notifications only run when the outermost batch finishes.
 * @param fn The function to execute within the batch.
 * @returns The return value of the executed function.
 */
export function batch(fn) {
    // Export batch
    batchDepth++;
    let errorOccurred = false;
    let result;
    // Stores details of atoms that actually changed value for final notification.
    const changesToNotify = []; // Use unknown for atom type
    try {
        result = fn(); // Execute the provided function
    }
    catch (e) {
        errorOccurred = true;
        throw e; // Re-throw the error after cleanup (in finally)
    }
    finally {
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
                            changesToNotify.push({
                                atom: atom,
                                value: currentValue,
                                oldValue: originalValueBeforeBatch,
                            });
                        }
                    }
                }
            }
            finally {
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
            }
            catch (_err) { }
        }
    }
    // Return the result of the batch function.
    // Non-null assertion is safe because errors are re-thrown.
    return result; // Remove non-null assertion, TS should infer T
}
