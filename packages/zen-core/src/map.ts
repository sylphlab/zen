// Core get/subscribe are not needed directly in this module
import { type KeyListener, _emitKeyChanges, listenKeys as addKeyListener } from './events'; // Import key listener logic AND _emitKeyChanges
// Remove this duplicate line
import type { AnyZen, MapZen, Unsubscribe } from './types'; // Ensure AnyZen is imported here
// Functional Map zen implementation.
import type { Zen } from './zen';
// Removed import { STORE_MAP_KEY_SET } from './keys';
import { batchDepth, notifyListeners, queueZenForBatch } from './zen'; // Import batch helpers and notifyListeners from './zen'
// Removed import { notifyListeners } from './zen'; // Import notifyListeners from './zen'

// MapZen type is now defined in types.ts

// --- Functional API for Map ---

/**
 * Creates a Map Zen (functional style).
 * @template T The type of the object state.
 * @param initialValue The initial object state. A shallow copy is made.
 * @returns A MapZen instance.
 */
export function map<T extends object>(initialValue: T): MapZen<T> {
  // Create the merged MapZen object directly
  const mapZen: MapZen<T> = {
    _kind: 'map',
    _value: { ...initialValue }, // Shallow copy initial value
    // Listener properties (_listeners, etc.) are initially undefined
  };
  // Removed Reflect.defineProperty call for STORE_MAP_KEY_SET
  return mapZen;
}

// Core get/subscribe are exported via index.ts from zen.ts

/** @internal */
function _handleMapOnSet<T extends object>(mapZen: MapZen<T>, nextValue: T): void {
  if (batchDepth <= 0) {
    const setLs = mapZen._setListeners;
    if (setLs?.size) {
      for (const fn of setLs) {
        try {
          fn(nextValue);
        } catch (_e) {}
      }
    }
  }
}

/** @internal */
function _handleMapKeyNotification<T extends object, K extends keyof T>(
  mapZen: MapZen<T>,
  oldValue: T,
  nextValue: T,
  key: K,
): void {
  if (batchDepth > 0) {
    queueZenForBatch(mapZen as Zen<T>, oldValue);
  } else {
    // Immediate notifications
    _emitKeyChanges(mapZen, [key], nextValue);
    notifyListeners(mapZen as AnyZen, nextValue, oldValue);
  }
}

/**
 * Sets a specific key in the Map Zen, creating a new object immutably.
 * Notifies both map-level and key-specific listeners.
 */
export function setKey<T extends object, K extends keyof T>(
  mapZen: MapZen<T>,
  key: K,
  value: T[K],
  forceNotify = false,
): void {
  // Operate directly on the mapZen
  const oldValue = mapZen._value;

  // Only proceed if the value for the key has actually changed or if forced.
  if (forceNotify || !Object.is(oldValue[key], value)) {
    const nextValue = { ...oldValue, [key]: value };

    // 1. Handle onSet listeners (outside batch)
    _handleMapOnSet(mapZen, nextValue);

    // 2. Update value DIRECTLY
    mapZen._value = nextValue;

    // 3. Handle Batching or Immediate Notification
    _handleMapKeyNotification(mapZen, oldValue, nextValue, key);
  }
}

/** @internal */
function _calculateChangedMapKeys<T extends object>(
  oldValue: T | null | undefined,
  nextValue: T,
): (keyof T)[] {
  const changedKeys: (keyof T)[] = [];
  // Add null check for safety
  if (oldValue && nextValue) {
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(nextValue)]) as Set<
      keyof T
    >;
    for (const k of allKeys) {
      if (!Object.is(oldValue[k], nextValue[k])) {
        changedKeys.push(k);
      }
    }
  } else if (nextValue) {
    // If oldValue was null/undefined, all keys in nextValue are new
    changedKeys.push(...(Object.keys(nextValue) as (keyof T)[]));
  }
  return changedKeys;
}

/** @internal */
function _handleMapSetUpdateAndNotify<T extends object>(
  mapZen: MapZen<T>,
  oldValue: T,
  nextValue: T, // Original next value from caller
  changedKeys: (keyof T)[],
  forceNotify: boolean,
): void {
  // Only proceed with updates and notifications if keys actually changed or forced
  if (changedKeys.length > 0 || forceNotify) {
    // Emit changes for all keys that differed *before* setting the value
    if (changedKeys.length > 0) {
      // Still only emit key changes if keys changed
      _emitKeyChanges(mapZen, changedKeys, nextValue);
    }

    // Set the mapZen's value (shallow copy)
    mapZen._value = { ...nextValue };

    // Handle batching or immediate notification
    if (batchDepth > 0) {
      queueZenForBatch(mapZen as Zen<T>, oldValue); // Cast for queue
    } else {
      // Notify general listeners with the *newly set* (copied) value
      notifyListeners(mapZen as AnyZen, mapZen._value, oldValue);
    }
  }
  // If no keys changed and not forced, do nothing (value reference might differ but content is same)
}

/**
 * Sets the entire value of the Map Zen, replacing the current object.
 * Notifies both map-level and relevant key-specific listeners.
 */
export function set<T extends object>(mapZen: MapZen<T>, nextValue: T, forceNotify = false): void {
  // Operate directly on mapZen
  const oldValue = mapZen._value;

  if (forceNotify || !Object.is(nextValue, oldValue)) {
    // Calculate changed keys using helper
    const changedKeys = _calculateChangedMapKeys(oldValue, nextValue);

    // Handle onSet listeners (outside batch) using existing helper
    _handleMapOnSet(mapZen, nextValue);

    // Handle update, key emission, value setting, and notifications using new helper
    _handleMapSetUpdateAndNotify(mapZen, oldValue, nextValue, changedKeys, forceNotify);
  }
}

/** Listens to changes for specific keys within a Map Zen. */
export function listenKeys<T extends object, K extends keyof T>(
  mapZen: MapZen<T>,
  keys: K[],
  listener: KeyListener<T, K>,
): Unsubscribe {
  // Delegates to the function from events.ts, passing the mapZen itself
  return addKeyListener(mapZen, keys, listener);
}

// Note: Factory function is now 'map'.
