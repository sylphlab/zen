// Functional DeepMap atom implementation.
import type { Unsubscribe, /* Listener, */ AnyAtom, /* AtomWithValue, */ DeepMapAtom } from './types'; // Remove unused AtomWithValue again
import { get as getCoreValue, subscribe as subscribeToCoreAtom } from './atom'; // Import core get/subscribe
import type { Atom } from './atom'; // Import Atom type for casting
import { listenPaths as addPathListener, _emitPathChanges, PathListener } from './events'; // Path listener logic
import { batchDepth, queueAtomForBatch } from './batch'; // Import batch helpers
import { notifyListeners } from './internalUtils'; // Import notifyListeners
import { STORE_MAP_KEY_SET } from './keys'; // Symbol marker
import { Path, setDeep, getChangedPaths } from './deepMapInternal'; // Deep object utilities

// DeepMapAtom type is now defined in types.ts

// --- Functional API for DeepMap ---

/**
 * Creates a DeepMap Atom (functional style).
 * @template T The type of the object state.
 * @param initialValue The initial object state. It's used directly.
 * @returns A DeepMapAtom instance.
 */
export function deepMap<T extends object>(initialValue: T): DeepMapAtom<T> {
  // Create the merged DeepMapAtom object directly
  const deepMapAtom: DeepMapAtom<T> = {
    _kind: 'deepMap',
    _value: initialValue, // Use initial value directly (deep clone happens in setDeep)
    // Listener properties (_listeners, etc.) are initially undefined
  };
  // Mark the atom so listenPaths can identify it (hidden symbol)
  Reflect.defineProperty(deepMapAtom, STORE_MAP_KEY_SET, { value: true, enumerable: false });
  return deepMapAtom;
}

// get and subscribe are now handled by the core functions in atom.ts
// Re-export core get/subscribe for compatibility
export { getCoreValue as get, subscribeToCoreAtom as subscribe };

/**
 * Sets a value at a specific path within the DeepMap Atom, creating a new object immutably.
 * Notifies both map-level and relevant path-specific listeners.
 */
export function setPath<T extends object>(
  deepMapAtom: DeepMapAtom<T>,
  path: Path,
  value: unknown, // Use unknown instead of any
  forceNotify = false
): void {
  // Prevent errors with empty paths.
  if (!path || (Array.isArray(path) && path.length === 0) || path === '') {
      console.warn('setPath called with an empty path. Operation ignored.'); // Updated warning
      return;
  }

  // Operate directly on deepMapAtom
  const currentValue = deepMapAtom._value;

  // Use the utility to create a new object with the value set at the path.
  const nextValue = setDeep(currentValue, path, value);

  // Only proceed if the state actually changed or if forced.
  if (forceNotify || nextValue !== currentValue) {
    // Manual notification orchestration similar to map.setKey
    if (batchDepth <= 0) {
        const setLs = deepMapAtom._setListeners;
        if (setLs?.size) {
            for (const fn of setLs) {
                                // Assert nextValue type for the listener
                                try { fn(nextValue as T); } catch(e) { console.error(`Error in onSet listener for deepMap path set ${String(deepMapAtom)}:`, e); }
            }
        }
    }

        // Assert nextValue type for assignment
        deepMapAtom._value = nextValue as T;

    if (batchDepth > 0) {
                queueAtomForBatch(deepMapAtom as Atom<T>, currentValue);
    } else {
        // Emit path changes first (pass deepMapAtom directly)
        _emitPathChanges(deepMapAtom, [path], nextValue as T);
        // Notify general listeners
        notifyListeners(deepMapAtom, nextValue, currentValue);
    }
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
  // Operate directly on deepMapAtom
  const oldValue = deepMapAtom._value;

  if (forceNotify || !Object.is(nextValue, oldValue)) {
    // Calculate changed paths *before* setting the value
    const changedPaths = getChangedPaths(oldValue, nextValue);

    // Emit changes for all paths that differed *before* setting the value
    if (changedPaths.length > 0) {
            // Cast to AnyAtom<T> for _emitPathChanges
                        // Pass deepMapAtom directly
                        _emitPathChanges(deepMapAtom, changedPaths, nextValue);
    }
    // Set the deepMapAtom's value directly and notify
    // Manual notification needed here
    if (batchDepth <= 0) {
        const setLs = deepMapAtom._setListeners;
        if (setLs?.size) {
            for (const fn of setLs) {
                try { fn(nextValue); } catch(e) { console.error(`Error in onSet listener for deepMap set ${String(deepMapAtom)}:`, e); }
            }
        }
    }
    deepMapAtom._value = nextValue;
    if (batchDepth > 0) {
        queueAtomForBatch(deepMapAtom as Atom<T>, oldValue);
    } else {
        notifyListeners(deepMapAtom, nextValue, oldValue);
    }
  }
}

/** Listens to changes for specific paths within a DeepMap Atom. */
export function listenPaths<T extends object>(
    deepMapAtom: DeepMapAtom<T>,
    paths: Path[],
    listener: PathListener<T>
): Unsubscribe {
    // Delegates to the function from events.ts, passing the deepMapAtom itself
    // Cast to AnyAtom<any> to bypass strict check, as listenPaths internals are compatible
            // Pass deepMapAtom directly, as addPathListener expects MapAtom | DeepMapAtom
            return addPathListener(deepMapAtom, paths, listener);
}

// Note: Factory function is now 'deepMap', path setter is 'setPath', etc.
