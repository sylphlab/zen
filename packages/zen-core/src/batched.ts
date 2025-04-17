// Batched computed store implementation (Nanostores style)
import type { AnyAtom, AtomValue, Listener, Unsubscribe } from './types';
import { subscribe, notifyListeners, get } from './atom'; // Use core subscribe, notifyListeners, AND get
// Removed unused ComputedAtom import

// --- Types ---

// Similar to ComputedAtom but with batched update logic
export type BatchedAtom<T = unknown> = {
    _kind: 'batched'; // Distinguish from regular computed
    _value: T | null; // Can be null initially
    _stores: AnyAtom[];
    _calculation: (...values: any[]) => T;
    _listeners?: Set<Listener<T | null>>; // Listeners expect T | null
    _dirty: boolean; // Still needed to track if calculation is required
    _pendingUpdate: boolean; // Flag to prevent scheduling multiple microtasks
    _unsubscribers: Unsubscribe[];
    _update: () => void; // Function to perform the actual update, run via microtask
    _subscribeToSources: () => void;
    _unsubscribeFromSources: () => void;
};

// --- Simplified Microtask Logic (No Global Queue) ---
// Each batched atom schedules its own update via queueMicrotask.

// No top-level debug needed now


// --- Batched Function ---

// Overload for single store dependency
export function batched<T, S1 extends AnyAtom>(
    store1: S1,
    calculation: (value1: AtomValue<S1>) => T
): BatchedAtom<T>;

// Overload for multiple store dependencies
export function batched<T, Stores extends AnyAtom[]>(
    stores: [...Stores],
    calculation: (...values: { [K in keyof Stores]: AtomValue<Stores[K]> }) => T
): BatchedAtom<T>;

// Implementation
export function batched<T>(
    stores: AnyAtom | AnyAtom[],
    calculation: (...values: any[]) => T
): BatchedAtom<T> {
    const storesArray = Array.isArray(stores) ? stores : [stores];
    // Removed unused initialValueCalculated flag

    const atom: BatchedAtom<T> = {
        _kind: 'batched',
        _value: null, // Start as null until first calculation
        _stores: storesArray,
        _calculation: calculation,
        _listeners: undefined, // Initialized on first subscribe
        _dirty: true, // Start dirty
        _pendingUpdate: false, // No update scheduled initially
        _unsubscribers: [],

        // Convert _update to an arrow function to capture `this` (atom) context correctly for queueMicrotask
        _update: () => {
            atom._pendingUpdate = false; // Reset pending flag

            // Only calculate if dirty
            if (!atom._dirty) return;

            const oldInternalValue = atom._value;

            // Get current values from dependencies using the public get() function.
            // get() handles updating dirty computed atoms automatically.
            let dependenciesReady = true;
            const currentValues = new Array(atom._stores.length);
            for (let i = 0; i < atom._stores.length; i++) {
                const source = atom._stores[i];
                // Add truthiness check for source
                if (source) {
                    // Cannot synchronously get value from another dirty batched atom
                    if (source._kind === 'batched' && (source as BatchedAtom<unknown>)._dirty) {
                        dependenciesReady = false;
                        break;
                    }
                    // Use get() for all other types (atom, computed, map, etc.)
                    // Need 'as any' because TS struggles with the generic overload matching here.
                    currentValues[i] = get(source as any);
                    // If get() returns null for a computed atom that should have updated,
                    // it implies an issue within get() or computed._update() itself.
                } else {
                    // Handle case where source might be undefined/null in the array
                    currentValues[i] = undefined; // Or handle as appropriate
                    // Consider if this should mark dependencies as not ready?
                    // For now, let the calculation function handle potential undefined.
                }
                // However, we also need to consider if null is a valid computed value.
                // For now, let's assume get() works correctly and allow nulls through.
                // If a dependency is a batched atom that isn't dirty, get() just returns its current value.
            }


            // If any dependency wasn't ready (only possible for dirty batched dependencies now),
            // remain dirty and wait for the dependency to trigger onChange again.
            if (!dependenciesReady) {
                 atom._dirty = true;
                 // Do NOT re-schedule here, wait for onChange from the dependency
                 return;
            }
            // Note: We proceed even if some currentValues are null (valid state or failed computed update).
            // The calculation function itself should handle null inputs if necessary.

            // Dependencies are ready, proceed with calculation
            atom._dirty = false; // Mark as clean *before* calculation

            try {
                const newValue = atom._calculation(...currentValues); // No need for 'as any[]' if currentValues is properly typed
                const changed = !Object.is(newValue, oldInternalValue);

                if (changed) {
                    atom._value = newValue;
                    // Pass oldInternalValue directly (it might be null)
                    notifyListeners(atom as AnyAtom, newValue, oldInternalValue);
                }
            } catch (error) {
                console.error("!!! Error during batched calculation:", error); // Make error more prominent
                atom._dirty = true; // Remain dirty on error
            }
        },

        _subscribeToSources: () => {
            if (atom._unsubscribers.length > 0) return; // Already subscribed

            // Schedule initial calculation after subscribing to sources
            // The atom starts dirty, so the update will run.
            if (!atom._pendingUpdate) {
                 atom._pendingUpdate = true;
                 queueMicrotask(atom._update); // Use queueMicrotask
            }

            const onChange = () => {
                if (!atom._dirty) { // Only mark dirty if not already dirty
                    atom._dirty = true;
                }
                // Schedule an update if not already pending for this tick
                if (!atom._pendingUpdate) {
                    atom._pendingUpdate = true;
                    queueMicrotask(atom._update); // Use queueMicrotask
                }
            };

            atom._unsubscribers = atom._stores.map(sourceStore =>
                subscribe(sourceStore as AnyAtom, onChange)
            );
        },

        _unsubscribeFromSources: () => {
            atom._unsubscribers.forEach(unsub => unsub());
            atom._unsubscribers = [];
            // No queue cleanup needed anymore
            // If an update was pending, it might run but won't notify if listeners are gone.
            // Or we could try to cancel it, but queueMicrotask doesn't support cancellation.
        }
    };

    // Need to import notifyListeners for the _update function
    // This import needs to be at the top level
    // import { notifyListeners } from './atom'; // Already imported

    return atom;
}