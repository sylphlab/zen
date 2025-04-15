import {
  Atom,
  ReadonlyAtom,
  Unsubscribe,
  EventCallback,
  SetEventCallback,
  NotifyEventCallback,
  EventPayload,
} from './core'

// Helper to ensure the event listener set exists on the store
function ensureSet<T extends Atom<any> | ReadonlyAtom<any>, K extends keyof T>(
  store: T,
  key: K
): Set<any> {
  if (!store[key]) {
    ;(store as any)[key] = new Set<any>()
  }
  return store[key] as Set<any>
}

// Helper to create the unsubscribe function
function createUnsubscribe<CB>(store: Atom<any> | ReadonlyAtom<any>, eventKey: keyof (Atom<any> | ReadonlyAtom<any>), callback: CB): Unsubscribe {
    return () => {
        const listeners = store[eventKey] as Set<CB> | undefined;
        listeners?.delete(callback);
        // Potential cleanup if set becomes empty? Maybe not needed.
    };
}

/**
 * Listens for the first listener subscribing (`onStart`) and the last listener
 * unsubscribing (`onStop`), with a debounce delay for `onStop`.
 * Useful for managing resources like network connections that should only be
 * active when the store is in use.
 *
 * @param store The store to listen to.
 * @param mount Initialize callback, run when the store becomes active.
 *              Can return a cleanup function (`unmount`).
 * @returns Function to stop listening.
 */
export function onMount(
  store: Atom<any> | ReadonlyAtom<any>,
  mount: () => Unsubscribe | void
): Unsubscribe {
  const listeners = ensureSet(store, '_onMount')
  const payload: EventPayload = { shared: {} } // Create shared context for this listener pair

  const callback: EventCallback = () => {
      // Execute the user's mount function and store the cleanup
      const cleanup = mount();
      if (cleanup) {
          if (!store._mountCleanups) {
              store._mountCleanups = new Set();
          }
          store._mountCleanups.add(cleanup);
      }
      // Return the actual cleanup function to be called by the core
      return () => {
          if (cleanup) {
              store._mountCleanups?.delete(cleanup);
              cleanup();
          }
      }
  }

  listeners.add(callback);
  // If store is already active, call mount immediately
  if (store._active) {
      // Pass the payload when calling the callback immediately
      callback(payload); // This will execute mount() and store the cleanup if returned
  }

  return createUnsubscribe(store, '_onMount', callback);
}


/**
 * Low-level: Listens for the first listener subscribing.
 * Prefer `onMount` for most use cases.
 */
export function onStart(
  store: Atom<any> | ReadonlyAtom<any>,
  start: EventCallback
): Unsubscribe {
  const listeners = ensureSet(store, '_onStart')
  listeners.add(start)
   // If store is already active, call start immediately? Nanostores doesn't seem to.
  return createUnsubscribe(store, '_onStart', start);
}

/**
 * Low-level: Listens for the last listener unsubscribing.
 * Prefer `onMount` for most use cases.
 */
export function onStop(
  store: Atom<any> | ReadonlyAtom<any>,
  stop: EventCallback
): Unsubscribe {
  const listeners = ensureSet(store, '_onStop')
  listeners.add(stop)
  return createUnsubscribe(store, '_onStop', stop);
}

/**
 * Listens for changes *before* they are applied to the store.
 * Allows validation and aborting the change.
 */
export function onSet<T>(
  store: Atom<T> | ReadonlyAtom<T>, // Allow on ReadonlyAtom for computed internal sets
  setCallback: SetEventCallback<T>
): Unsubscribe {
  const listeners = ensureSet(store, '_onSet')
  listeners.add(setCallback)
  return createUnsubscribe(store, '_onSet', setCallback);
}

/**
 * Listens for changes *before* listeners are notified.
 * Allows aborting the notification.
 */
export function onNotify<T>(
  store: Atom<T> | ReadonlyAtom<T>,
  notifyCallback: NotifyEventCallback<T>
): Unsubscribe {
  const listeners = ensureSet(store, '_onNotify')
  listeners.add(notifyCallback)
  return createUnsubscribe(store, '_onNotify', notifyCallback);
}

// TODO: Implement trigger logic within atom.ts/computed.ts
// TODO: Implement onMount debounce logic
