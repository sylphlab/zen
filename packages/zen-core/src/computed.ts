import type { BatchedZen } from './batched'; // Import BatchedZen type
// Functional computed (derived state) implementation.
import type { AnyZen, Unsubscribe, ZenWithValue } from './types';
import { notifyListeners } from './zen';
// Removed getZenValue, subscribeToZen imports as logic is inlined

// --- Type Definitions ---
/** Represents a computed zen's specific properties (functional style). */
// It directly includes ZenWithValue properties now.
export type ComputedZen<T = unknown> = ZenWithValue<T | null> & {
  // Value can be null initially
  _kind: 'computed';
  _value: T | null; // Override value type
  _dirty: boolean;
  readonly _sources: ReadonlyArray<AnyZen>; // Use AnyZen recursively
  _sourceValues: unknown[]; // Use unknown[] instead of any[]
  // Internal calculation function accepts spread arguments
  readonly _calculation: (...values: unknown[]) => T;
  readonly _equalityFn: (a: T, b: T) => boolean;
  _unsubscribers?: Unsubscribe[];
  // Add internal methods needed by functional API calls
  _update: () => boolean;
  _subscribeToSources: () => void;
  _unsubscribeFromSources: () => void;
};

/** Alias for ComputedZen, representing the read-only nature. */
export type ReadonlyZen<T = unknown> = ComputedZen<T>;

// --- Types ---
/** Represents an array of source zens. */
type Stores = ReadonlyArray<AnyZen>; // Use AnyZen directly

// Removed unused StoreValues type

// --- Internal Computed Logic ---

/**
 * Fetches current values from dependency stores and checks readiness.
 * Mutates the targetValueArray with fetched values.
 * @param sources Array of dependency stores.
 * @param targetValueArray Array to populate with fetched values.
 * @returns True if all dependencies are ready, false otherwise.
 * @internal
 */
function _getSourceValuesAndReadiness(
  sources: ReadonlyArray<AnyZen>,
  targetValueArray: unknown[], // Mutates this array
): boolean {
  let computedCanUpdate = true;
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    if (!source) {
      targetValueArray[i] = undefined;
      continue; // Skip missing sources
    }

    let sourceValue: unknown;
    switch (source._kind) {
      case 'zen':
      case 'map':
      case 'deepMap':
        sourceValue = source._value;
        break;
      case 'computed': {
        const computedSource = source as ComputedZen<unknown>;
        if (computedSource._dirty || computedSource._value === null) {
          computedSource._update(); // Recursive call
          if (computedSource._dirty || computedSource._value === null) {
            computedCanUpdate = false;
          }
        }
        sourceValue = computedSource._value;
        break;
      }
      case 'batched': {
        const batchedSource = source as BatchedZen<unknown>;
        if (batchedSource._dirty) {
          computedCanUpdate = false;
        }
        sourceValue = batchedSource._value;
        break;
      }
    }

    if (!computedCanUpdate) {
      break; // Stop collecting if not ready
    }
    targetValueArray[i] = sourceValue;
  }
  return computedCanUpdate;
}

/**
 * Recalculates the computed value based on current source values.
 * Updates the internal `_value` and notifies listeners if the value changes.
 * Assumes the zen is already marked as dirty or needs initial calculation.
 * @returns True if the value changed, false otherwise.
 * @internal
 */
function updateComputedValue<T>(zen: ComputedZen<T>): boolean {
  const srcs = zen._sources;

  // If there are no sources, the value cannot be computed.
  if (!srcs || srcs.length === 0) {
    zen._dirty = true; // Remain dirty
    return false;
  }

  const vals = zen._sourceValues;
  const calc = zen._calculation;
  const old = zen._value; // Capture value BEFORE recalculation (could be null)

  // 1. Get current values and check readiness using helper
  const computedCanUpdate = _getSourceValuesAndReadiness(srcs, vals);

  // If dependencies weren't ready (e.g., dirty batched dependency, or nested computed failed update),
  // mark computed as dirty and return false (no change).
  if (!computedCanUpdate) {
    zen._dirty = true;
    return false;
  }
  // Note: We proceed even if some vals are null, assuming null is a valid state.
  // The calculation function itself should handle null inputs if necessary.

  // *** ADDED CHECK: Ensure all collected values are not undefined before calculating ***
  if (vals.some((v) => v === undefined)) {
    zen._dirty = true; // Remain dirty if any source value is still undefined
    return false;
  }
  // *** END ADDED CHECK ***

  // 2. Dependencies are ready, proceed with calculation
  const newValue = calc(...vals); // vals are now guaranteed non-null AND non-undefined
  zen._dirty = false; // Mark as clean *after* successful calculation

  // 3. Check if the value actually changed using the equality function
  // Handle the initial null case for 'old'
  if (old !== null && zen._equalityFn(newValue, old)) {
    return false; // No change, exit early
  }

  // 4. Update internal value
  zen._value = newValue;

  // 5. Value updated. Return true to indicate change.
  // DO NOT notify here. Notification is handled by the caller (e.g., computedSourceChanged or batch end).
  return true; // Value changed
}

/**
 * Handler called when any source zen changes.
 * Marks the computed zen as dirty and triggers an update if active.
 * @internal
 */
function computedSourceChanged<T>(zen: ComputedZen<T>): void {
  if (zen._dirty) return; // Already dirty, no need to do anything further.

  zen._dirty = true;

  // If there are active listeners, trigger an update and notify *if* the value changed.
  // This propagates the change down the computed chain.
  if (zen._listeners?.size) {
    const oldValue = zen._value; // Store value before potential update
    // Use the internal _update method which calls updateComputedValue
    const changed = updateComputedValue(zen); // Directly call update logic
    if (changed) {
      // Use the exported notifyListeners
      try {
        // Cast to AnyZen for notifyListeners
        notifyListeners(zen as AnyZen, zen._value, oldValue); // Notify downstream listeners (removed !)
      } catch (_e) {}
    }
  }
  // If no listeners, we just stay dirty until the next `getZenValue()`.
}

/**
 * Subscribes to a single source zen and returns the unsubscribe function.
 * @internal
 */
function _subscribeToSingleSource( // Remove unused computedZen parameter
  source: AnyZen | undefined,
  onChangeHandler: () => void,
): Unsubscribe | undefined {
  if (!source) return undefined;

  const baseSource = source as ZenWithValue<unknown>; // Cast to unknown
  const isFirstSourceListener = !baseSource._listeners?.size;
  baseSource._listeners ??= new Set();
  baseSource._listeners.add(onChangeHandler); // Add the computed's handler

  // Trigger source's onStart/onMount logic removed
  if (isFirstSourceListener) {
    // If the source is itself computed, trigger its source subscription
    if (source._kind === 'computed') {
      // Check kind directly
      const computedSource = source as ComputedZen<unknown>; // Cast
      if (typeof computedSource._subscribeToSources === 'function') {
        computedSource._subscribeToSources();
      }
    }
  }
  // Don't call the listener immediately here, computed handles initial calc

  // Return the unsubscribe logic for this specific source
  return () => _handleSourceUnsubscribeCleanup(source, onChangeHandler);
}

/**
 * Handles the cleanup logic when unsubscribing from a single source.
 * @internal
 */
function _handleSourceUnsubscribeCleanup(
  source: AnyZen, // Source is guaranteed non-null here
  onChangeHandler: () => void,
): void {
  const baseSrc = source as ZenWithValue<unknown>; // Cast to unknown
  const srcListeners = baseSrc._listeners;
  if (!srcListeners?.has(onChangeHandler)) return;

  srcListeners.delete(onChangeHandler);

  if (!srcListeners.size) {
    baseSrc._listeners = undefined;
    // onStop logic removed
    if (source._kind === 'computed') {
      const computedSource = source as ComputedZen<unknown>;
      if (typeof computedSource._unsubscribeFromSources === 'function') {
        computedSource._unsubscribeFromSources();
      }
    }
  }
}

/** Subscribes a computed zen to all its source zens. @internal */
function subscribeComputedToSources<T>(zen: ComputedZen<T>): void {
  if (zen._unsubscribers) return; // Avoid double subscriptions

  const sources = zen._sources;
  const newUnsubscribers: Unsubscribe[] = []; // Collect valid unsubscribers

  // Create a bound handler specific to this computed zen instance
  const onChangeHandler = () => computedSourceChanged(zen);

  for (let i = 0; i < sources.length; i++) {
    const unsub = _subscribeToSingleSource(sources[i], onChangeHandler); // Call without computedZen
    if (unsub) {
      newUnsubscribers.push(unsub); // Add only valid unsub functions
    }
  }
  zen._unsubscribers = newUnsubscribers; // Assign the filtered array
}

/** Unsubscribes a computed zen from all its source zens. @internal */
function unsubscribeComputedFromSources<T>(zen: ComputedZen<T>): void {
  if (!zen._unsubscribers) return; // Nothing to unsubscribe from

  for (const unsub of zen._unsubscribers) {
    unsub?.(); // Call each unsubscribe function
  }
  zen._unsubscribers = undefined; // Clear the array
  zen._dirty = true; // Mark as dirty when inactive, forces recalc on next activation
}

// --- Override getZenValue for Computed ---
// We need to modify or wrap getZenValue to handle computed logic.
// This is now handled in zen.ts's getZenValue by calling updateComputedValue.

// --- Computed Factory (Functional Style) ---

/**
 * Creates a read-only computed zen (functional style).
 * Its value is derived from one or more source zens using a calculation function.
 *
 * @template T The type of the computed value.
 * @template S Tuple type of the source stores.
 * @param stores An array or tuple of source zens (AnyZen).
 * @param calculation A function that takes the current values of the source stores
 *   as individual arguments and returns the computed value.
 * @param equalityFn Optional function to compare the old and new computed values.
 *   Defaults to `Object.is`. If it returns true, listeners are not notified.
 * @returns A ReadonlyZen representing the computed value.
 */
export function computed<T, S extends AnyZen | Stores>(
  // Allow single zen or array
  stores: S,
  // Change signature to accept unknown[] for compatibility with internal call
  calculation: (...values: unknown[]) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is, // Default to Object.is
): ReadonlyZen<T> {
  // Normalize stores input to always be an array
  const storesArray = Array.isArray(stores) ? stores : [stores];

  // Define the structure adhering to ComputedZen<T> type
  // Optimize: Only initialize essential computed properties. Listeners omitted.
  const computedZen: ComputedZen<T> = {
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
    _subscribeToSources: () => subscribeComputedToSources(computedZen),
    _unsubscribeFromSources: () => unsubscribeComputedFromSources(computedZen),
    _update: () => updateComputedValue(computedZen),
    // _onChange is not directly called externally, computedSourceChanged handles it
  };

  // onMount logic removed

  // The getZenValue in zen.ts now calls updateComputedValue if dirty.
  // The subscribeToZen in zen.ts now calls subscribeComputedToSources/unsubscribeComputedFromSources.

  return computedZen; // Return the computed zen structure
}

// Note: getZenValue and subscribeToZen logic in zen.ts handles computed zen specifics.
