// Functional Map atom implementation.
import { Atom, Unsubscribe, Listener, AnyAtom } from './core'; // Removed AtomTypes
import { createAtom, get as getAtomValue, set as setAtomValue, subscribe as subscribeToAtom } from './atom'; // Import updated functional atom API
import { listenKeys as addKeyListener, _emitKeyChanges, KeyListener } from './events'; // Key listener logic from events
import { STORE_MAP_KEY_SET } from './keys'; // Symbol marker for map atoms

/** Type definition for the functional Map Atom structure. */
export type MapAtom<T extends object> = {
  // Removed $$id and $$type
  readonly _internalAtom: Atom<T>; // Internal atom holding the object state
  // Key listeners are managed by the events module via WeakMap
};

// --- Functional API for Map ---

/**
 * Creates a Map Atom (functional style).
 * @template T The type of the object state.
 * @param initialValue The initial object state. A shallow copy is made.
 * @returns A MapAtom instance.
 */
export function createMap<T extends object>(initialValue: T): MapAtom<T> {
  const internalAtom = createAtom<T>({ ...initialValue }); // Use createAtom
  // Optimize: Only initialize the internal atom.
  const mapAtom: MapAtom<T> = {
    _internalAtom: internalAtom,
  };
  // Mark the internal atom so listenKeys can identify it
  (internalAtom as any)[STORE_MAP_KEY_SET] = true;
  return mapAtom;
}

/** Gets the current value (the whole object) of a Map Atom. */
export function get<T extends object>(mapAtom: MapAtom<T>): T {
  // The internal atom for a map should never be null
  return getAtomValue(mapAtom._internalAtom)!;
}

/** Subscribes to changes in the entire Map Atom object. */
export function subscribe<T extends object>(mapAtom: MapAtom<T>, listener: Listener<T>): Unsubscribe {
  // Subscribe to the internal atom
  return subscribeToAtom(mapAtom._internalAtom, listener);
}

/**
 * Sets a specific key in the Map Atom, creating a new object immutably.
 * Notifies both map-level and key-specific listeners.
 */
export function setKey<T extends object, K extends keyof T>(
  mapAtom: MapAtom<T>,
  key: K,
  value: T[K],
  forceNotify = false
): void {
  const internalAtom = mapAtom._internalAtom;
  const currentValue = get(mapAtom); // Use renamed get function


  // Only proceed if the value for the key has actually changed or if forced.
  if (forceNotify || !Object.is(currentValue[key], value)) {
    const nextValue = { ...currentValue, [key]: value };
    // Emit key change *before* setting the value and triggering general listeners
    _emitKeyChanges(internalAtom, [key] as (keyof T)[], nextValue); // Remove 'as Atom<any>'
    // Set the internal atom's value using the functional API
    setAtomValue(internalAtom as Atom<T>, nextValue, forceNotify); // Use as Atom<T>
  }
}

/**
 * Sets the entire value of the Map Atom, replacing the current object.
 * Notifies both map-level and relevant key-specific listeners.
 */
export function set<T extends object>(
  mapAtom: MapAtom<T>,
  nextValue: T,
  forceNotify = false
): void {
  const internalAtom = mapAtom._internalAtom;
  const oldValue = get(mapAtom); // Use renamed get function

  if (forceNotify || !Object.is(nextValue, oldValue)) {
    // --- Calculate changed keys efficiently ---
    const changedKeys: (keyof T)[] = [];
    // Add null check for safety, although getMapValue should prevent null
    if (oldValue && nextValue) {
        const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(nextValue)]) as Set<keyof T>;
        for (const k of allKeys) {
          if (!Object.is(oldValue[k], nextValue[k])) {
            changedKeys.push(k);
          }
        }
    } else if (nextValue) { // If oldValue was null/undefined, all keys in nextValue are new
        changedKeys.push(...(Object.keys(nextValue) as (keyof T)[]));
    }
    // --- End Calculate changed keys ---

    // Emit changes for all keys that differed *before* setting the value
    if (changedKeys.length > 0) {
       // Use 'as any' for changedKeys array type assertion if needed, but not for internalAtom
      _emitKeyChanges(internalAtom, changedKeys as (keyof T)[], nextValue); // Remove 'as Atom<any>'
    }

    // Set the internal atom's value
    setAtomValue(internalAtom as Atom<T>, nextValue, forceNotify); // Use as Atom<T>
  }
}

/** Listens to changes for specific keys within a Map Atom. */
export function listenKeys<T extends object, K extends keyof T>(
    mapAtom: MapAtom<T>,
    keys: K[],
    listener: KeyListener<T, K>
): Unsubscribe {
    // Delegates to the function from events.ts, passing the internal atom
    // Use 'as any' for internalAtom if type issues persist with addKeyListener
    return addKeyListener(mapAtom._internalAtom as AnyAtom<T>, keys, listener);
}

// Optional: Keep the old 'map' export for backward compatibility during transition?
// For now, let's assume a clean break and only export the new functional API.
// export { createMap as map };
