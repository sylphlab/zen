// Batched computed store implementation (Nanostores style)
import type { AnyAtom, AtomValue, Listener, Unsubscribe } from './types';
import { subscribe, notifyListeners } from './atom'; // Use core subscribe AND notifyListeners
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

            // Get current values from dependencies.
            // MUST force update dirty computed dependencies synchronously here.
            let dependenciesReady = true;
            const currentValues = atom._stores.map(s => {
                let sourceValue: unknown;
                if (s._kind === 'computed') {
                    const computedSource = s as import('./computed').ComputedAtom<unknown>; // Use import type
                    if (computedSource._dirty || computedSource._value === null) {
                        const updated = computedSource._update(); // Force update computed and check result
                        if (!updated || computedSource._dirty || computedSource._value === null) { // Check if update failed or still dirty/null
                            dependenciesReady = false; // Still not ready
                        }
                    }
                    sourceValue = computedSource._value; // Read value after potential update
                    // Explicitly check if the value is still null after update attempt
                    if (sourceValue === null && dependenciesReady) {
                         // If computed is still null but reported updated, treat dependency as not ready?
                         // Or maybe allow null through? Let's try allowing null for now.
                         // console.log("!!! Computed source is null after update attempt !!!");
                    }
                } else if (s._kind === 'batched') {
                    // Cannot synchronously update another batched atom.
                    // If it's dirty, we must wait for its own microtask/timeout.
                    const batchedSource = s as BatchedAtom<unknown>;
                    if (batchedSource._dirty) {
                        dependenciesReady = false;
                    }
                    sourceValue = batchedSource._value; // Read potentially stale value
                } else {
                    // Simple atom or map
                    sourceValue = s._value;
                }

                if (!dependenciesReady) return null; // Early exit if dependency not ready
                return sourceValue;
            });

            // If any dependency wasn't ready (e.g., dirty batched dependency, or computed failed update),
            // remain dirty and wait for the dependency to trigger onChange again.
            if (!dependenciesReady) {
                 atom._dirty = true;
                 // Do NOT re-schedule here, wait for onChange from the dependency
                 return;
            }
            // Note: We proceed even if some currentValues are null, assuming null is a valid state.
            // The calculation function itself should handle null inputs if necessary.

            // All dependencies are ready and non-null
            atom._dirty = false; // Mark as clean *before* calculation

            try {
                const newValue = atom._calculation(...currentValues as any[]);
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