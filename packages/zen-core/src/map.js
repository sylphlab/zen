// Removed import { STORE_MAP_KEY_SET } from './keys';
import { batchDepth, notifyListeners, queueAtomForBatch } from './atom'; // Import batch helpers and notifyListeners from './atom'
// Core get/subscribe are not needed directly in this module
import { _emitKeyChanges, listenKeys as addKeyListener } from './events'; // Import key listener logic AND _emitKeyChanges
// Removed import { notifyListeners } from './atom'; // Import notifyListeners from './atom'
// MapAtom type is now defined in types.ts
// --- Functional API for Map ---
/**
 * Creates a Map Atom (functional style).
 * @template T The type of the object state.
 * @param initialValue The initial object state. A shallow copy is made.
 * @returns A MapAtom instance.
 */
export function map(initialValue) {
  // Create the merged MapAtom object directly
  const mapAtom = {
    _kind: 'map',
    _value: { ...initialValue }, // Shallow copy initial value
    // Listener properties (_listeners, etc.) are initially undefined
  };
  // Removed Reflect.defineProperty call for STORE_MAP_KEY_SET
  return mapAtom;
}
// Core get/subscribe are exported via index.ts from atom.ts
/**
 * Sets a specific key in the Map Atom, creating a new object immutably.
 * Notifies both map-level and key-specific listeners.
 */
export function setKey(mapAtom, key, value, forceNotify = false) {
  // Operate directly on the mapAtom
  const oldValue = mapAtom._value;
  // Only proceed if the value for the key has actually changed or if forced.
  if (forceNotify || !Object.is(oldValue[key], value)) {
    const nextValue = { ...oldValue, [key]: value };
    // --- Manual Notification Orchestration ---
    // 1. Handle onSet (only outside batch)
    if (batchDepth <= 0) {
      const setLs = mapAtom._setListeners; // Use mapAtom
      if (setLs?.size) {
        // Use size for Set
        for (const fn of setLs) {
          // Iterate Set
          try {
            fn(nextValue);
          } catch (_e) {}
        }
      }
    }
    // 2. Update value DIRECTLY
    mapAtom._value = nextValue;
    // 3. Handle Batching or Immediate Notification
    if (batchDepth > 0) {
      // Queue the mapAtom itself, storing the value *before* this setKey call
      queueAtomForBatch(mapAtom, oldValue); // Cast for queue
    } else {
      // --- Immediate Notifications (Outside Batch) ---
      // a. Notify key-specific listeners for the changed key using _emitKeyChanges
      // Pass the mapAtom directly, as _emitKeyChanges expects MapAtom | DeepMapAtom
      _emitKeyChanges(mapAtom, [key], nextValue);
      // b. Notify general value listeners and onNotify listeners
      // Use the standard notifyListeners, passing the mapAtom, add 'as any'
      // Cast mapAtom to AnyAtom for notifyListeners.
      notifyListeners(mapAtom, nextValue, oldValue);
      // --- End Immediate Notifications ---
    }
    // --- End Manual Notification Orchestration ---
  }
}
/**
 * Sets the entire value of the Map Atom, replacing the current object.
 * Notifies both map-level and relevant key-specific listeners.
 */
export function set(mapAtom, nextValue, forceNotify = false) {
  // Operate directly on mapAtom
  const oldValue = mapAtom._value;
  if (forceNotify || !Object.is(nextValue, oldValue)) {
    // --- Calculate changed keys efficiently ---
    const changedKeys = [];
    // Add null check for safety, although getMapValue should prevent null
    if (oldValue && nextValue) {
      const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(nextValue)]);
      for (const k of allKeys) {
        if (!Object.is(oldValue[k], nextValue[k])) {
          changedKeys.push(k);
        }
      }
    } else if (nextValue) {
      // If oldValue was null/undefined, all keys in nextValue are new
      changedKeys.push(...Object.keys(nextValue));
    }
    // --- End Calculate changed keys ---
    // Only proceed with updates and notifications if keys actually changed or forced
    if (changedKeys.length > 0 || forceNotify) {
      // Emit changes for all keys that differed *before* setting the value
      if (changedKeys.length > 0) {
        // Still only emit key changes if keys changed
        // Pass the mapAtom directly
        _emitKeyChanges(mapAtom, changedKeys, nextValue);
      }
      // Set the mapAtom's value directly and notify
      // Manual notification needed here as setAtomValue is for basic Atom
      if (batchDepth <= 0) {
        const setLs = mapAtom._setListeners;
        if (setLs?.size) {
          for (const fn of setLs) {
            try {
              fn(nextValue);
            } catch (_e) {}
          }
        }
      }
      mapAtom._value = { ...nextValue }; // Create shallow copy
      if (batchDepth > 0) {
        queueAtomForBatch(mapAtom, oldValue); // Cast for queue
      } else {
        // Cast mapAtom to AnyAtom for notifyListeners.
        // Cast mapAtom to AnyAtom for notifyListeners. (Already done in previous step, ensure it remains)
        notifyListeners(mapAtom, nextValue, oldValue);
      }
    }
  }
}
/** Listens to changes for specific keys within a Map Atom. */
export function listenKeys(mapAtom, keys, listener) {
  // Delegates to the function from events.ts, passing the mapAtom itself
  return addKeyListener(mapAtom, keys, listener);
}
// Note: Factory function is now 'map'.
