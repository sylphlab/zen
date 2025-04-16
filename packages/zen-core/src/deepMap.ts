// DeepMap atom implementation for managing nested object state with path-specific listeners.
import { Atom, Unsubscribe } from './core';
import { atom } from './atom'; // Base atom factory
import { listenPaths as addPathListener, _emitPathChanges, PathListener } from './events'; // Path listener logic
import { STORE_MAP_KEY_SET } from './keys'; // Symbol marker for map atoms
import { Path, setDeep, getChangedPaths } from './deepMapInternal'; // Deep object utilities

/**
 * Represents a DeepMap Atom, extending the base Atom with methods
 * for setting values at specific paths and listening to path changes.
 */
export type DeepMap<T extends object> = Atom<T> & {
  /** Sets a value at a specific path within the object, creating a new object immutably. */
  setPath(path: Path, value: any, forceNotify?: boolean): void;
  /** Listens to changes at specific paths (including nested paths). */
  listenPaths(paths: Path[], listener: PathListener<T>): Unsubscribe;
  /** Internal marker symbol. */
  [STORE_MAP_KEY_SET]?: boolean;
};

/**
 * Creates a DeepMap Atom, optimized for managing nested object state.
 * Allows setting values at specific paths and subscribing to changes affecting those paths.
 *
 * @template T The type of the object state.
 * @param initialValue The initial object state. It's used directly (not copied initially).
 * @returns A DeepMap instance.
 */
export function deepMap<T extends object>(initialValue: T): DeepMap<T> {
  // 1. Create a base atom.
  const baseAtom = atom<T>(initialValue);
  // Cast to DeepMap type.
  const deepMapAtom = baseAtom as DeepMap<T>;

  // 2. Mark the atom so `listenPaths` and `_emitPathChanges` can identify it.
  deepMapAtom[STORE_MAP_KEY_SET] = true;

  // 3. Internal flag to prevent `set` override from duplicating path change emission
  //    when called internally by `setPath`.
  let isCalledBySetPath = false;

  // 4. Add the `setPath` method.
  deepMapAtom.setPath = function(path: Path, value: any, forceNotify = false): void {
    // Prevent errors with empty paths.
    if (!path || (Array.isArray(path) && path.length === 0) || path === '') {
        console.warn('deepMap.setPath called with an empty path. Operation ignored.');
        return;
    }

    const currentValue = this.get(); // Get current state
    // Use the utility to create a new object with the value set at the path.
    const nextValue = setDeep(currentValue, path, value);

    // Only proceed if the state actually changed or if forced.
    // `setDeep` returns the original object if the value at path is already the same.
    if (forceNotify || nextValue !== currentValue) {
      // Set the internal flag before calling the base `set`.
      isCalledBySetPath = true;
      try {
        // Call the original (potentially patched) `set` method of the base atom.
        // This handles lifecycle events (`onSet`) and batching.
        baseAtom.set(nextValue, forceNotify);

        // Emit the change for this specific path *after* the base `set` completes.
        // The event/batch patching on `baseAtom.set` handles the main notification;
        // this specifically notifies path listeners.
        _emitPathChanges(this, [path], nextValue);
      } finally {
        // Always reset the flag.
        isCalledBySetPath = false;
      }
    }
  };

  // 5. Override the base `set` method to calculate and emit all changed paths.
  const originalBaseSet = deepMapAtom.set; // Capture original set from the instance
  deepMapAtom.set = function(nextValue: T, forceNotify = false): void {
    // If `set` is called internally by `setPath`, `setPath` already handled
    // the path emission. We just need to let the original `set` run.
    if (isCalledBySetPath) {
      originalBaseSet.call(this, nextValue, forceNotify);
      return;
    }

    // Standard `set` logic: compare old and new values.
    const oldValue = this._value;
    if (forceNotify || !Object.is(nextValue, oldValue)) {
      // Call the original (potentially patched) `set` method of the base atom first.
      originalBaseSet.call(this, nextValue, forceNotify);

      // Calculate changed paths *after* the base set completes.
      const changedPaths = getChangedPaths(oldValue, nextValue);

      // Emit changes for all paths that differed.
      if (changedPaths.length > 0) {
        _emitPathChanges(this, changedPaths, nextValue);
      }
    }
  };

  // 6. Add the `listenPaths` method (delegates to the function from events.ts).
  deepMapAtom.listenPaths = function(paths: Path[], listener: PathListener<T>): Unsubscribe {
    // `addPathListener` (imported as listenPaths) handles patching and listener storage.
    return addPathListener(this, paths, listener);
  };

  // Note: Batching is handled by the patched `set` method on the `baseAtom`.

  return deepMapAtom;
}
