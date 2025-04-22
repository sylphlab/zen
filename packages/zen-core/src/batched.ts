// Batched computed store implementation (Nanostores style)
import type { AnyZen, Listener, Unsubscribe, ZenValue } from './types';
import { get, notifyListeners, subscribe } from './zen'; // Use core subscribe, notifyListeners, AND get
// Removed unused ComputedZen import

// --- Types ---

// Similar to ComputedZen but with batched update logic
export type BatchedZen<T = unknown> = {
  _kind: 'batched'; // Distinguish from regular computed
  _value: T | null; // Can be null initially
  _stores: AnyZen[];
  _calculation: (...values: unknown[]) => T;
  _listeners?: Set<Listener<T | null>>; // Listeners expect T | null
  _dirty: boolean; // Still needed to track if calculation is required
  _pendingUpdate: boolean; // Flag to prevent scheduling multiple microtasks
  _unsubscribers: Unsubscribe[];
  _update: () => void; // Function to perform the actual update, run via microtask
  _subscribeToSources: () => void;
  _unsubscribeFromSources: () => void;
};

// --- Simplified Microtask Logic (No Global Queue) ---
// Each batched zen schedules its own update via queueMicrotask.

// No top-level debug needed now

// --- Helper Function for Dependency Value Fetching ---

/**
 * Fetches current values from dependency stores.
 * @param stores Array of dependency stores.
 * @returns A tuple: [dependenciesAreReady: boolean, currentValues: unknown[]]
 * @internal
 */
function _getDependencyValues(stores: AnyZen[]): [boolean, unknown[]] {
  let dependenciesReady = true;
  const currentValues = new Array(stores.length);
  for (let i = 0; i < stores.length; i++) {
    const source = stores[i];
    if (source) {
      // Cannot synchronously get value from another dirty batched zen
      if (source._kind === 'batched' && (source as BatchedZen<unknown>)._dirty) {
        dependenciesReady = false;
        break;
      }
      // Use get() for all other types
      // biome-ignore lint/suspicious/noExplicitAny: TS struggles with generic overload resolution here
      currentValues[i] = get(source as any);
    } else {
      currentValues[i] = undefined;
    }
  }
  return [dependenciesReady, currentValues];
}

// --- Batched Function ---

// Overload for single store dependency
export function batched<T, S1 extends AnyZen>(
  store1: S1,
  calculation: (value1: ZenValue<S1>) => T,
): BatchedZen<T>;

// Overload for multiple store dependencies
export function batched<T, Stores extends AnyZen[]>(
  stores: [...Stores],
  calculation: (...values: { [K in keyof Stores]: ZenValue<Stores[K]> }) => T,
): BatchedZen<T>;

// Implementation
export function batched<T>(
  stores: AnyZen | AnyZen[],
  calculation: (...values: unknown[]) => T,
): BatchedZen<T> {
  const storesArray = Array.isArray(stores) ? stores : [stores];
  // Removed unused initialValueCalculated flag

  const zen: BatchedZen<T> = {
    _kind: 'batched',
    _value: null, // Start as null until first calculation
    _stores: storesArray,
    _calculation: calculation,
    _listeners: undefined, // Initialized on first subscribe
    _dirty: true, // Start dirty
    _pendingUpdate: false, // No update scheduled initially
    _unsubscribers: [],

    // Convert _update to an arrow function to capture `this` (zen) context correctly for queueMicrotask
    _update: () => {
      zen._pendingUpdate = false; // Reset pending flag

      // Only calculate if dirty
      if (!zen._dirty) return;

      const oldInternalValue = zen._value;

      // Get current values from dependencies using the helper function.
      const [dependenciesReady, currentValues] = _getDependencyValues(zen._stores);

      // If any dependency wasn't ready (dirty batched dependency),
      // remain dirty and wait for the dependency to trigger onChange again.
      if (!dependenciesReady) {
        zen._dirty = true;
        // Do NOT re-schedule here, wait for onChange from the dependency
        return;
      }
      // Note: We proceed even if some currentValues are null (valid state or failed computed update).
      // The calculation function itself should handle null inputs if necessary.

      // Dependencies are ready, proceed with calculation
      zen._dirty = false; // Mark as clean *before* calculation

      try {
        const newValue = zen._calculation(...currentValues); // No need for 'as any[]' if currentValues is properly typed
        const changed = !Object.is(newValue, oldInternalValue);

        if (changed) {
          zen._value = newValue;
          // Pass oldInternalValue directly (it might be null)
          notifyListeners(zen as AnyZen, newValue, oldInternalValue);
        }
      } catch (_error) {
        zen._dirty = true; // Remain dirty on error
      }
    },

    _subscribeToSources: () => {
      if (zen._unsubscribers.length > 0) return; // Already subscribed

      // Schedule initial calculation after subscribing to sources
      // The zen starts dirty, so the update will run.
      if (!zen._pendingUpdate) {
        zen._pendingUpdate = true;
        queueMicrotask(zen._update); // Use queueMicrotask
      }

      const onChange = () => {
        if (!zen._dirty) {
          // Only mark dirty if not already dirty
          zen._dirty = true;
        }
        // Schedule an update if not already pending for this tick
        if (!zen._pendingUpdate) {
          zen._pendingUpdate = true;
          queueMicrotask(zen._update); // Use queueMicrotask
        }
      };

      zen._unsubscribers = zen._stores.map((sourceStore) =>
        subscribe(sourceStore as AnyZen, onChange),
      );
    },

    _unsubscribeFromSources: () => {
      for (const unsub of zen._unsubscribers) {
        unsub();
      }
      zen._unsubscribers = [];
      // No queue cleanup needed anymore
      // If an update was pending, it might run but won't notify if listeners are gone.
      // Or we could try to cancel it, but queueMicrotask doesn't support cancellation.
    },
  };

  // Need to import notifyListeners for the _update function
  // This import needs to be at the top level
  // import { notifyListeners } from './zen'; // Already imported

  return zen;
}
