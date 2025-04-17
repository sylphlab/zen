import type { AnyAtom, AtomValue, Unsubscribe } from './types';
import { subscribe } from './atom'; // Use core subscribe

/**
 * Subscribes to multiple stores and runs a callback function when any of them change.
 * The callback receives the current values of the stores as arguments.
 * If the callback returns a function, it will be treated as a cleanup function
 * and executed before the next callback run or when the effect is cancelled.
 *
 * @param stores An array of stores to subscribe to.
 * @param callback The function to run on changes. It receives store values as arguments.
 * @returns A function to cancel the effect and unsubscribe from all stores.
 */
export function effect<Stores extends AnyAtom[]>(
    stores: [...Stores],
    callback: (...values: { [K in keyof Stores]: AtomValue<Stores[K]> }) => (void | (() => void))
): Unsubscribe {
    let lastCleanup: void | (() => void);
    let isCancelled = false;

    // Function to run the callback and handle cleanup
    const runCallback = () => {
        if (isCancelled) return; // Don't run if cancelled

        // Run previous cleanup if it exists
        if (typeof lastCleanup === 'function') {
            try {
                lastCleanup();
            } catch (error) {
                console.error("Error during effect cleanup:", error);
            }
        }

        // Get current values (handle potential null from computed/batched initial state)
        // Cast needed for subscribe/get compatibility within generic context
        const currentValues = stores.map(s => {
             if (s._kind === 'computed' || s._kind === 'batched') {
                 const computedOrBatched = s as any; // Cast to access internal properties
                 if (computedOrBatched._dirty || computedOrBatched._value === null) {
                    computedOrBatched._update?.(); // Use optional chaining for safety
                 }
                 return computedOrBatched._value; // Can be null
             } else {
                 return s._value as AtomValue<typeof s>; // Cast needed
             }
        });

        // Check if any value is still null (initial state for computed/batched)
        // If so, don't run the callback yet, wait for actual values.
        if (currentValues.some(v => v === null)) {
             lastCleanup = undefined; // Ensure no cleanup is stored if callback didn't run
             return;
        }

        try {
            // Run the main callback and store the new cleanup function
            lastCleanup = callback(...currentValues as any); // Cast needed for spread arguments
        } catch (error) {
            console.error("Error during effect callback:", error);
            lastCleanup = undefined; // Reset cleanup on error
        }
    };

    // Subscribe to all stores
    // Cast needed for subscribe
    const unsubscribers = stores.map(store => subscribe(store as AnyAtom, runCallback));

    // Run the callback immediately with initial values (if not null)
    runCallback();

    // Return the final cleanup function
    return () => {
        if (isCancelled) return;
        isCancelled = true;

        // Run final cleanup
        if (typeof lastCleanup === 'function') {
            try {
                lastCleanup();
            } catch (error) {
                console.error("Error during final effect cleanup:", error);
            }
        }

        // Unsubscribe from all stores
        unsubscribers.forEach(unsub => unsub());
    };
}