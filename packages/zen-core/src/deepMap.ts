// Functional DeepMap atom implementation.
import { Atom, Unsubscribe, Listener, AnyAtom, MapAtom, DeepMapAtom } from './core'; // Removed AtomTypes
import { createAtom, get as getAtomValue, set as setAtomValue, subscribe as subscribeToAtom } from './atom'; // Import updated functional atom API
import { listenPaths as addPathListener, _emitPathChanges, PathListener } from './events'; // Path listener logic
import { STORE_MAP_KEY_SET } from './keys'; // Symbol marker
import { Path, setDeep, getChangedPaths } from './deepMapInternal'; // Deep object utilities

// Removed local definition of DeepMapAtom, using the one from core.ts

// --- Functional API for DeepMap ---

/**
 * Creates a DeepMap Atom (functional style).
 * @template T The type of the object state.
 * @param initialValue The initial object state. It's used directly.
 * @returns A DeepMapAtom instance.
 */
export function createDeepMap<T extends object>(initialValue: T): DeepMapAtom<T> {
  const internalAtom = createAtom<T>(initialValue); // Use createAtom
  // Optimize: Only initialize the internal atom.
  const deepMapAtom: DeepMapAtom<T> = {
    _internalAtom: internalAtom,
  };
  // Mark the internal atom so listenPaths can identify it
  (internalAtom as any)[STORE_MAP_KEY_SET] = true;
  return deepMapAtom;
}

/** Gets the current value (the whole object) of a DeepMap Atom. */
export function get<T extends object>(deepMapAtom: DeepMapAtom<T>): T {
  // The internal atom for a deepMap should never be null
  return getAtomValue(deepMapAtom._internalAtom)!;
}

/** Subscribes to changes in the entire DeepMap Atom object. */
export function subscribe<T extends object>(deepMapAtom: DeepMapAtom<T>, listener: Listener<T>): Unsubscribe {
  // Subscribe to the internal atom
  return subscribeToAtom(deepMapAtom._internalAtom, listener);
}

/**
 * Sets a value at a specific path within the DeepMap Atom, creating a new object immutably.
 * Notifies both map-level and relevant path-specific listeners.
 */
export function setPath<T extends object>(
  deepMapAtom: DeepMapAtom<T>,
  path: Path,
  value: any,
  forceNotify = false
): void {
  // Prevent errors with empty paths.
  if (!path || (Array.isArray(path) && path.length === 0) || path === '') {
      console.warn('setPath called with an empty path. Operation ignored.'); // Updated warning
      return;
  }

  const internalAtom = deepMapAtom._internalAtom;
  const currentValue = get(deepMapAtom); // Use renamed get function

  // Use the utility to create a new object with the value set at the path.
  const nextValue = setDeep(currentValue, path, value);

  // Only proceed if the state actually changed or if forced.
  if (forceNotify || nextValue !== currentValue) {
    // Emit the change for this specific path *before* setting the value
    _emitPathChanges(internalAtom, [path], nextValue); // Remove 'as Atom<any>'
    // Set the internal atom's value using the functional API
    setAtomValue(internalAtom as Atom<T>, nextValue, forceNotify); // Use as Atom<T>
  }
}

/**
 * Sets the entire value of the DeepMap Atom, replacing the current object.
 * Notifies both map-level and relevant path-specific listeners.
 */
export function set<T extends object>(
  deepMapAtom: DeepMapAtom<T>,
  nextValue: T,
  forceNotify = false
): void {
  const internalAtom = deepMapAtom._internalAtom;
  const oldValue = get(deepMapAtom); // Use renamed get function

  if (forceNotify || !Object.is(nextValue, oldValue)) {
    // Calculate changed paths *before* setting the value
    const changedPaths = getChangedPaths(oldValue, nextValue);

    // Emit changes for all paths that differed *before* setting the value
    if (changedPaths.length > 0) {
      _emitPathChanges(internalAtom, changedPaths, nextValue); // Remove 'as Atom<any>'
    }
    // Set the internal atom's value
    setAtomValue(internalAtom as Atom<T>, nextValue, forceNotify); // Use as Atom<T>
  }
}

/** Listens to changes for specific paths within a DeepMap Atom. */
export function listenPaths<T extends object>(
    deepMapAtom: DeepMapAtom<T>,
    paths: Path[],
    listener: PathListener<T>
): Unsubscribe {
    // Delegates to the function from events.ts, passing the internal atom
    // Use 'as any' for internalAtom if type issues persist
    return addPathListener(deepMapAtom._internalAtom as AnyAtom<T>, paths, listener);
}

// Optional: Keep old exports for backward compatibility?
// export { createDeepMap as deepMap };
// export { setPath as setDeepMapPath };
// export { set as setDeepMapValue };
// export { get as getDeepMapValue };
// export { subscribe as subscribeToDeepMap };
// export { listenPaths as listenDeepMapPaths };
