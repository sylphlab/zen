// Combined imports from @sylphlab/zen-core
import {
  map,
  atom,
  onMount,
  get,
  set,
  subscribe,
  type MapAtom,
  type Atom
} from '@sylphlab/zen-core';

// --- Types ---

/** Storage interface compatible with localStorage and sessionStorage */
export interface StorageEngine {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Encoding/decoding functions */
export interface Serializer<Value> {
  encode: (value: Value) => string;
  decode: (raw: string) => Value;
}

/** Options for persistent stores */
export interface PersistentOptions<Value> {
  /** Web Storage engine. Defaults to `localStorage`. */
  storage?: StorageEngine;
  /** Custom JSON-like serializer. Defaults to `JSON`. */
  serializer?: Serializer<Value>;
  /** Optional: Listen for storage events (cross-tab sync). Defaults to true. */
  listen?: boolean;
}

// --- Implementation ---

const GenericJSONSerializer = {
  encode: JSON.stringify,
  decode: JSON.parse
};

/**
 * Creates a persistent atom that synchronizes its state with Web Storage
 * (localStorage or sessionStorage) and across browser tabs.
 *
 * @param key Unique key for the storage entry.
 * @param initialValue Initial value if nothing is found in storage.
 * @param options Configuration options.
 * @returns A writable atom synchronized with storage.
 */
export function persistentAtom<Value>(
  key: string,
  initialValue: Value,
  options?: PersistentOptions<Value>
): Atom<Value> { // Use Atom<Value> type
  const storage = options?.storage ?? (typeof window !== 'undefined' ? localStorage : undefined);
  const serializer = options?.serializer ?? GenericJSONSerializer;
  const shouldListen = options?.listen ?? true;

  if (typeof window === 'undefined' || !storage) {
    console.warn(`[zen-persistent] Storage unavailable for key "${key}". Using a non-persistent atom.`);
    return atom<Value>(initialValue); // Fallback to regular atom if no storage
  }

  const baseAtom = atom<Value>(initialValue);
  let ignoreNextStorageEvent = false; // Flag to prevent echo from self-triggered events

  // Function to write the current atom value to storage
  const writeToStorage = (value: Value) => {
    try {
      const encoded = serializer.encode(value);
      ignoreNextStorageEvent = true; // Mark that we are causing the potential storage event
      storage.setItem(key, encoded);
    } catch (error) {
      console.error(`[zen-persistent] Error writing key "${key}" to storage:`, error);
    } finally {
      // Reset flag shortly after, hoping storage event fires sync
      // This is imperfect, a better sync mechanism might be needed
      setTimeout(() => { ignoreNextStorageEvent = false; }, 50);
    }
  };

  // Subscribe to base atom changes AFTER initial value is set
  let stopCoreListener: (() => void) | undefined;

  // Handler for storage events (cross-tab sync)
  const storageEventHandler = (event: StorageEvent) => {
    if (event.key === key && event.storageArea === storage) {
      if (ignoreNextStorageEvent) {
        // ignoreNextStorageEvent = false; // Reset happens in timeout now
        return; // Ignore event triggered by this instance
      }
      if (event.newValue === null) { // Key removed or cleared in another tab
        set(baseAtom, initialValue); // Use set() function
      } else {
        try {
          const decodedValue = serializer.decode(event.newValue);
          // Check if the decoded value is different before setting to prevent loops
          if (get(baseAtom) !== decodedValue) { // Use get() function
            set(baseAtom, decodedValue); // Use set() function
          }
        } catch (error) {
          console.error(`[zen-persistent] Error decoding key "${key}" from storage event:`, error);
          // Optionally reset to initial value on decode error
          // baseAtom.set(initialValue);
        }
      }
    }
  };

  // Use onMount to load initial value and set up listeners
  const _unmount = onMount(baseAtom, () => {
    // --- Mount (runs when the first listener subscribes) ---
    let valueFromStorage: Value | undefined;
    try {
      const raw = storage.getItem(key);
      if (raw !== null) {
        valueFromStorage = serializer.decode(raw);
      }
    } catch (error) {
      console.error(`[zen-persistent] Error reading initial value for key "${key}" from storage:`, error);
    }

    // Set initial value from storage if different from current
    if (valueFromStorage !== undefined && get(baseAtom) !== valueFromStorage) { // Use get() function
       set(baseAtom, valueFromStorage); // Use set() function
       // Note: This set() will trigger the core listener below if it's already active
    } else if (valueFromStorage === undefined) {
      // If nothing in storage, write the current (initial) value
      writeToStorage(get(baseAtom)); // Use get() function
    }

    // Start listening to core atom changes *after* initial load/set
    if (!stopCoreListener) {
      // Use subscribe() function instead of listen() method
      stopCoreListener = subscribe(baseAtom, (newValue: Value) => {
        writeToStorage(newValue);
      });
    }

    // Add cross-tab listener if enabled
    if (shouldListen) {
      window.addEventListener('storage', storageEventHandler);
    }

    // --- Unmount (runs shortly after the last listener unsubscribes) ---
    return () => {
      if (shouldListen) {
        window.removeEventListener('storage', storageEventHandler);
      // We intentionally DO NOT stop the core listener (`stopCoreListener`) here.
      // The persistence should continue even if UI components unmount temporarily.
    };
  });

  return baseAtom;

/**
 * Creates a persistent map store that synchronizes its state with Web Storage
 * (localStorage or sessionStorage) and across browser tabs.
 *
 * Note: Currently, cross-tab synchronization updates the entire map object,
 * not individual keys.
 *
 * @param key Unique key for the storage entry.
 * @param initialValue Initial value if nothing is found in storage.
 * @param options Configuration options.
 * @returns A map store synchronized with storage.
 */


export function persistentMap<Value extends object>( // Remove blank lines
  key: string,
  initialValue: Value,
  options?: PersistentOptions<Value>
): MapAtom<Value> {
  const storage = options?.storage ?? (typeof window !== 'undefined' ? localStorage : undefined);
  const serializer = options?.serializer ?? GenericJSONSerializer;
  const shouldListen = options?.listen ?? true;

  if (typeof window === 'undefined' || !storage) {
    console.warn(`[zen-persistent] Storage unavailable for key "${key}". Using a non-persistent map.`);
    return map<Value>(initialValue); // Fallback to regular map if no storage
  }

  const baseMap = map<Value>(initialValue);
  let ignoreNextStorageEvent = false; // Flag to prevent echo from self-triggered events

  // Function to write the current map value to storage
  const writeToStorage = (value: Value) => {
    try {
      const encoded = serializer.encode(value);
      ignoreNextStorageEvent = true; // Mark that we are causing the potential storage event
      storage.setItem(key, encoded);
    } catch (error) {
      console.error(`[zen-persistent] Error writing key "${key}" to storage:`, error);
    } finally {
      // Reset flag shortly after
      setTimeout(() => { ignoreNextStorageEvent = false; }, 50);
    }
  };

  // Subscribe to base map changes AFTER initial value is set
  let stopCoreListener: (() => void) | undefined;

  // Handler for storage events (cross-tab sync)
  const storageEventHandler = (event: StorageEvent) => {
    if (event.key === key && event.storageArea === storage) {
      if (ignoreNextStorageEvent) {
        return; // Ignore event triggered by this instance
      }
      if (event.newValue === null) { // Key removed or cleared in another tab
        set(baseMap, initialValue); // Reset to initial value (updates the whole map)
      } else {
        try {
          const decodedValue = serializer.decode(event.newValue);
          // Update the whole map. Consider deep comparison if performance becomes an issue.
          set(baseMap, decodedValue);
        } catch (error) {
          console.error(`[zen-persistent] Error decoding key "${key}" from storage event:`, error);
        }
      }
    }
  };

  // Use onMount to load initial value and set up listeners
  const _unmount = onMount(baseMap, () => {
    // --- Mount ---
    let valueFromStorage: Value | undefined;
    try {
      const raw = storage.getItem(key);
      if (raw !== null) {
        valueFromStorage = serializer.decode(raw);
      }
    } catch (error) {
      console.error(`[zen-persistent] Error reading initial value for key "${key}" from storage:`, error);
    }

    // Set initial value from storage if different from current
    // Use set() which replaces the whole map content
    if (valueFromStorage !== undefined) {
       set(baseMap, valueFromStorage);
    } else {
      // If nothing in storage, write the current (initial) value
      writeToStorage(get(baseMap));
    }

    // Start listening to core map changes *after* initial load/set
    if (!stopCoreListener) {
      stopCoreListener = subscribe(baseMap, newValue => {
        writeToStorage(newValue);
      });
    }

    // Add cross-tab listener if enabled
    if (shouldListen) {
      window.addEventListener('storage', storageEventHandler);
    }

    // --- Unmount ---
    return () => {
      if (shouldListen) {
        window.removeEventListener('storage', storageEventHandler);
      }
      // Persistence continues even if UI unmounts
    };
  });

  // Return the original map store. Its value is managed by the listeners.
  // Functions like setKey will modify the baseMap, triggering the subscribe listener.
  return baseMap;
}





export { persistentMap };
