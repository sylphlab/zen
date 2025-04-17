// Functional DeepMap atom implementation.
import type { DeepMapAtom } from './types'; // Remove unused Unsubscribe, AnyAtom, AtomWithValue
import { get as getCoreValue, subscribe as subscribeToCoreAtom } from './atom'; // Import core get/subscribe
import type { Atom } from './atom'; // Import Atom type for casting
// Removed imports for listenPaths, _emitPathChanges, PathListener from './events'
import { batchDepth, queueAtomForBatch } from './batch'; // Import batch helpers
import { notifyListeners } from './internalUtils'; // Import notifyListeners
import { Path, setDeep } from './deepMapInternal'; // Deep object utilities (getChangedPaths removed)

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
  return deepMapAtom;
}

// get and subscribe are now handled by the core functions in atom.ts
// Re-export core get/subscribe for compatibility
export { getCoreValue as get, subscribeToCoreAtom as subscribe };

/**
 * Sets a value at a specific path within the DeepMap Atom, creating a new object immutably.
 * Notifies map-level listeners.
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
        // Path-specific change emission removed.
        // Notify general listeners, casting nextValue from unknown to T
        notifyListeners(deepMapAtom, nextValue as T, currentValue);
    }
  }
}

/**
 * Sets the entire value of the DeepMap Atom, replacing the current object.
 * Notifies map-level listeners.
 */
export function set<T extends object>(
  deepMapAtom: DeepMapAtom<T>,
  nextValue: T,
  forceNotify = false
): void {
  // Operate directly on deepMapAtom
  const oldValue = deepMapAtom._value;

  if (forceNotify || !Object.is(nextValue, oldValue)) {
    // Path-specific change calculation and emission removed.
    // Note: getChangedPaths might still be useful internally if we needed
    // fine-grained oldValue comparison for general listeners, but for now,
    // we just pass the whole old object.

    // Set the deepMapAtom's value directly and notify
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

// listenPaths function removed.

// Note: Factory function is now 'deepMap', path setter is 'setPath', etc.
