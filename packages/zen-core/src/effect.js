import { subscribe } from './atom'; // Use core subscribe
// Removed unused get import
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
export function effect(stores, callback) {
    let lastCleanup;
    let isCancelled = false;
    let initialRun = true; // Flag to track the first execution
    let setupComplete = false; // Flag to prevent running callback during setup
    // Function to run the callback and handle cleanup
    const runCallback = () => {
        // If cancelled, or if called during the setup phase, do nothing
        if (isCancelled || !setupComplete) {
            return;
        }
        // Run previous cleanup *before* getting new values, only if it's not the initial run
        if (!initialRun && typeof lastCleanup === 'function') {
            try {
                lastCleanup();
            }
            catch (error) {
                console.error("Error during effect cleanup:", error);
            }
            lastCleanup = undefined; // Reset cleanup after running
        }
        // Get current values, handling updates for computed/batched
        const currentValues = stores.map(s => {
            switch (s._kind) {
                case 'computed': {
                    const computed = s;
                    if (computed._dirty || computed._value === null) {
                        computed._update();
                    }
                    return computed._value; // Can be null
                }
                case 'batched': {
                    // Batched atoms update via microtask, read current value (might be null/stale)
                    // The effect will re-run if the batched atom updates later.
                    return s._value; // Can be null
                }
                case 'atom':
                case 'map':
                case 'deepMap':
                case 'task':
                    return s._value; // Direct value
                default:
                    // Should be unreachable with AnyAtom
                    console.error("Unknown atom kind encountered in effect:", s); // Log error instead
                    return null;
            }
        });
        // Check if any value is still null (initial state for computed/batched)
        const dependenciesReady = !currentValues.some(v => v === null);
        if (dependenciesReady) {
            // All values are non-null, proceed.
            try {
                // Run the main callback and store the new cleanup function
                // Cast needed as values were checked for null above.
                lastCleanup = callback(...currentValues); // Cast needed for spread arguments
            }
            catch (error) {
                console.error("Error during effect callback:", error);
                lastCleanup = undefined; // Reset cleanup on error
            }
        }
        // If dependencies are not ready, we simply don't run the callback or cleanup yet.
        // The effect will re-run when a dependency changes to a non-null value.
        // Mark initial run as done AFTER the first successful execution
        initialRun = false;
    };
    // Subscribe to all stores. Pass the unmodified runCallback.
    // The initial synchronous call from subscribe will be ignored due to setupComplete flag.
    const unsubscribers = stores.map(store => subscribe(store, runCallback));
    // Mark setup as complete AFTER all subscriptions are done
    setupComplete = true;
    // Manually trigger the first run AFTER setup is complete
    runCallback();
    // Return the final cleanup function
    return () => {
        if (isCancelled)
            return;
        isCancelled = true;
        // Run final cleanup
        if (typeof lastCleanup === 'function') {
            try {
                lastCleanup();
            }
            catch (error) {
                console.error("Error during final effect cleanup:", error);
            }
        }
        // Unsubscribe from all stores
        unsubscribers.forEach(unsub => unsub());
    };
}
