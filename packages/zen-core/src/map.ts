// Functional Map atom implementation.
import type { Atom } from './atom';
import type { MapAtom } from './types'; // Import MapAtom from types (Unsubscribe removed)
import { get as getCoreValue, subscribe as subscribeToCoreAtom } from './atom'; // Import core get/subscribe
// Removed imports for listenKeys, KeyListener, _emitKeyChanges from './events'
import { batchDepth, queueAtomForBatch } from './batch'; // Import batch helpers
import { notifyListeners } from './internalUtils'; // Import notifyListeners

// MapAtom type is now defined in types.ts

// --- Functional API for Map ---

/**
 * Creates a Map Atom (functional style).
 * @template T The type of the object state.
 * @param initialValue The initial object state. A shallow copy is made.
 * @returns A MapAtom instance.
 */
export function map<T extends object>(initialValue: T): MapAtom<T> {
  // Create the merged MapAtom object directly
  const mapAtom: MapAtom<T> = {
    _kind: 'map',
    _value: { ...initialValue }, // Shallow copy initial value
    // Listener properties (_listeners, etc.) are initially undefined
  };
  return mapAtom;
}

// Re-export core get/subscribe for compatibility with tests expecting them from map.ts
export { getCoreValue as get, subscribeToCoreAtom as subscribe };

/**
 * Sets a specific key in the Map Atom, creating a new object immutably.
 * Notifies map-level listeners.
 */
export function setKey<T extends object, K extends keyof T>(
  mapAtom: MapAtom<T>,
  key: K,
  value: T[K],
  forceNotify = false
): void {
  // Operate directly on the mapAtom
  const oldValue = mapAtom._value;

  // Only proceed if the value for the key has actually changed or if forced.
  if (forceNotify || !Object.is(oldValue[key], value)) {
    const nextValue = { ...oldValue, [key]: value };

    // --- Manual Notification Orchestration ---

    // 1. Handle onSet (only outside batch)
    if (batchDepth <= 0) {
      const setLs = mapAtom._setListeners;
      if (setLs?.size) {
        for (const fn of setLs) {
          try { fn(nextValue); } catch(e) { console.error(`Error in onSet listener for map key set ${String(mapAtom)}:`, e); }
        }
      }
    }

    // 2. Update value DIRECTLY
    mapAtom._value = nextValue;

    // 3. Handle Batching or Immediate Notification
    if (batchDepth > 0) {
      // Queue the mapAtom itself, storing the value *before* this setKey call
      queueAtomForBatch(mapAtom as Atom<T>, oldValue); // Cast for queue
    } else {
      // --- Immediate Notifications (Outside Batch) ---

      // a. Key-specific listeners removed.

      // b. Notify general value listeners and onNotify listeners
      notifyListeners(mapAtom, nextValue, oldValue);

      // --- End Immediate Notifications ---\
    }
    // --- End Manual Notification Orchestration ---\
  }
}

/**
 * Sets the entire value of the Map Atom, replacing the current object.
 * Notifies map-level listeners.
 */
export function set<T extends object>(
  mapAtom: MapAtom<T>,
  nextValue: T,
  forceNotify = false
): void {
  // Operate directly on mapAtom
  const oldValue = mapAtom._value;

  if (forceNotify || !Object.is(nextValue, oldValue)) {
    // Key-specific change calculation and emission removed.

    // Set the mapAtom's value directly and notify
    if (batchDepth <= 0) {
       const setLs = mapAtom._setListeners;
       if (setLs?.size) {
           for (const fn of setLs) {
               try { fn(nextValue); } catch(e) { console.error(`Error in onSet listener for map set ${String(mapAtom)}:`, e); }
           }
       }
    }
    mapAtom._value = nextValue;
    if (batchDepth > 0) {
        queueAtomForBatch(mapAtom as Atom<T>, oldValue); // Cast for queue
    } else {
        notifyListeners(mapAtom, nextValue, oldValue);
    }
  }
}

// listenKeys function removed.

// Note: Factory function is now 'map'.
