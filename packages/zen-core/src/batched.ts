// Batched computed store implementation (Nanostores style)
import type { AnyAtom, AtomValue, Listener, Unsubscribe } from './types';
import { subscribe, notifyListeners } from './atom'; // Use core subscribe AND notifyListeners, remove get
import type { ComputedAtom } from './computed'; // Import ComputedAtom

// --- Types ---

// Similar to ComputedAtom but with batched update logic
export type BatchedAtom<T = unknown> = {
    _kind: 'batched'; // Distinguish from regular computed
    _value: T | null; // Can be null initially
    _stores: AnyAtom[];
    _calculation: (...values: any[]) => T;
    _listeners?: Set<Listener<T | null>>; // Listeners expect T | null
    _dirty: boolean;
    _queued: boolean; // Flag to prevent multiple queueing in one tick
    _unsubscribers: Unsubscribe[];
    _update: () => void; // Function to perform the actual update
    _subscribeToSources: () => void;
    _unsubscribeFromSources: () => void;
};

// --- Microtask Queue ---

let microtaskQueued = false;
const updateQueue = new Set<BatchedAtom<any>>();

function processUpdateQueue() {
    // Create a copy to iterate over, allowing atoms to re-queue themselves (though unlikely needed)
    const atomsToUpdate = [...updateQueue];
    updateQueue.clear();
    microtaskQueued = false;

    for (const atom of atomsToUpdate) {
        // Check if still mounted before updating
        if (atom._listeners?.size) {
            atom._update(); // Perform the actual calculation and notification
        }
        atom._queued = false; // Reset queued flag
    }
}

function queueMicrotaskIfNeeded() {
    if (!microtaskQueued) {
        microtaskQueued = true;
        queueMicrotask(processUpdateQueue);
    }
}

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
    let initialValueCalculated = false;

    const atom: BatchedAtom<T> = {
        _kind: 'batched',
        _value: null, // Start as null until first calculation
        _stores: storesArray,
        _calculation: calculation,
        _listeners: undefined, // Initialized on first subscribe
        _dirty: true, // Start dirty
        _queued: false, // Not queued initially
        _unsubscribers: [],

        _update: () => {
            atom._dirty = false; // Mark as clean before calculation
            const oldInternalValue = atom._value; // Store previous internal value

            // Get current values from dependencies by manually checking _kind
            const currentValues = atom._stores.map(s => {
                if (s._kind === 'computed') {
                    // Explicitly handle computed atoms
                    const computed = s as ComputedAtom<AtomValue<typeof s>>;
                    if (computed._dirty || computed._value === null) {
                        computed._update();
                    }
                    return computed._value; // Can be null
                } else {
                    // For other types, _value holds the value directly. Cast needed.
                    return s._value as AtomValue<typeof s>;
                }
            });

            // Check if any dependency is still null (e.g., an uninitialized computed atom)
            if (currentValues.some(v => v === null && !initialValueCalculated)) {
                 // If it's the very first calculation and a dependency is null,
                 // stay dirty and don't calculate/notify yet.
                 atom._dirty = true;
                 return;
            }

            try {
                const newValue = atom._calculation(...currentValues);
                initialValueCalculated = true; // Mark initial value as calculated

                if (!Object.is(newValue, oldInternalValue)) {
                    atom._value = newValue;
                    // Notify listeners (use core notifyListeners)
                    // Cast needed for notifyListeners
                    notifyListeners(atom as AnyAtom, newValue, oldInternalValue);
                }
            } catch (error) {
                console.error("Error during batched calculation:", error);
                // Optionally: handle error state? For now, just log.
                // Keep atom dirty if calculation fails?
                atom._dirty = true;
            }
        },

        _subscribeToSources: () => {
            if (atom._unsubscribers.length > 0) return; // Already subscribed

            const onChange = () => {
                atom._dirty = true;
                if (!atom._queued && atom._listeners?.size) { // Only queue if mounted and not already queued
                    atom._queued = true;
                    updateQueue.add(atom);
                    queueMicrotaskIfNeeded();
                }
            };

            atom._unsubscribers = atom._stores.map(sourceStore =>
                // Cast needed for subscribe
                subscribe(sourceStore as AnyAtom, onChange)
            );
        },

        _unsubscribeFromSources: () => {
            atom._unsubscribers.forEach(unsub => unsub());
            atom._unsubscribers = [];
            // Clean up from queue if it was queued but now unmounted
            if (atom._queued) {
                updateQueue.delete(atom);
                atom._queued = false;
                // If queue becomes empty, maybe cancel microtask? (complex, maybe unnecessary)
            }
        }
    };

    // Need to import notifyListeners for the _update function
    // This import needs to be at the top level
    // import { notifyListeners } from './atom'; // Already imported

    return atom;
}