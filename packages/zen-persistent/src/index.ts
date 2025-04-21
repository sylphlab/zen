// Combined imports from @sylphlab/zen-core
import {
  type Atom,
  type MapAtom,
  type Unsubscribe, // Added missing import
  get,
  map,
  onMount,
  set,
  subscribe,
  zen, // Change atom to zen
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
  decode: JSON.parse,
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
  options?: PersistentOptions<Value>,
): Atom<Value> {
  // Use Atom<Value> type
  const storage = options?.storage ?? (typeof window !== 'undefined' ? localStorage : undefined);
  const serializer = options?.serializer ?? GenericJSONSerializer;
  const shouldListen = options?.listen ?? true;

  if (typeof window === 'undefined' || !storage) {
    return zen<Value>(initialValue); // Fallback to regular atom if no storage
  }

  // --- Revised Initialization ---
  let initialValueFromStorage: Value | undefined;
  let storageIsEmpty = true;
  try {
    const raw = storage.getItem(key);
    if (raw !== null) {
      initialValueFromStorage = serializer.decode(raw);
      storageIsEmpty = false;
    }
  } catch (_error) { /* Ignore decode error */ }

  const actualInitialValue = initialValueFromStorage ?? initialValue;
  const baseAtom = zen<Value>(actualInitialValue);
  // --- End Revised Initialization ---


  let ignoreNextStorageEvent = false; // Flag to prevent echo from self-triggered events

  // Function to write the current atom value to storage
  const writeToStorage = (value: Value) => {
    try {
      console.log(`[persistent] Encoding value for key "${key}":`, value); // DEBUG
      const encoded = serializer.encode(value);
      console.log(`[persistent] Writing to storage key "${key}":`, encoded); // DEBUG
      ignoreNextStorageEvent = true; // Mark that we are causing the potential storage event
      storage.setItem(key, encoded);
    } catch (_error) {
      console.error(`[persistent] Error writing to storage key "${key}":`, _error); // DEBUG
    } finally {
      // Reset flag immediately
      ignoreNextStorageEvent = false;
    }
  };

  // If storage was initially empty, write the determined initial value now.
  if (storageIsEmpty) {
    writeToStorage(actualInitialValue);
  }

  // Subscribe to persist future changes immediately after creation.
  // We don't need to store the unsubscribe function unless we plan to stop persisting later.
  subscribe(baseAtom, (newValue: Value) => {
      writeToStorage(newValue);
  });

  // Handler for storage events (cross-tab sync)
  const storageEventHandler = (event: StorageEvent) => {
    if (event.key === key && event.storageArea === storage) {
      if (ignoreNextStorageEvent) {
        // ignoreNextStorageEvent = false; // Reset happens in timeout now
        return; // Ignore event triggered by this instance
      }
      if (event.newValue === null) {
        // Key removed or cleared in another tab
        set(baseAtom, initialValue); // Use set() function
      } else {
        try {
          const decodedValue = serializer.decode(event.newValue);
          // Check if the decoded value is different before setting to prevent loops
          if (get(baseAtom) !== decodedValue) {
            // Use get() function
            set(baseAtom, decodedValue); // Use set() function
          }
        } catch (_error) {
          // Optionally reset to initial value on decode error
          // baseAtom.set(initialValue);
        }
      }
    }
  };

  // Use onMount to load initial value and set up listeners
  // onMount is now only used for cross-tab sync setup/teardown
  const _unmount = onMount(baseAtom, () => {
    // --- Mount ---

    // Add cross-tab listener if enabled
    if (shouldListen) {
      window.addEventListener('storage', storageEventHandler);
    }

    // --- Unmount (runs shortly after the last listener unsubscribes) ---
    return () => {
      if (shouldListen) {
        window.removeEventListener('storage', storageEventHandler); // Add semicolon
      }
      // Stop the core listener? No, persistence should continue.
    };
  }); // End of onMount call

  return baseAtom;
}

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

export function persistentMap<Value extends object>(
  // Remove blank lines
  key: string,
  initialValue: Value,
  options?: PersistentOptions<Value>,
): MapAtom<Value> {
  const storage = options?.storage ?? (typeof window !== 'undefined' ? localStorage : undefined);
  const serializer = options?.serializer ?? GenericJSONSerializer;
  const shouldListen = options?.listen ?? true;

  if (typeof window === 'undefined' || !storage) {
    return map<Value>(initialValue); // Fallback to regular map if no storage
  }

  // --- Revised Initialization ---
  let initialValueFromStorage: Value | undefined;
  let storageIsEmpty = true;
  try {
    const raw = storage.getItem(key);
    if (raw !== null) {
      initialValueFromStorage = serializer.decode(raw);
      storageIsEmpty = false;
    }
  } catch (_error) { /* Ignore decode error */ }

  const actualInitialValue = initialValueFromStorage ?? initialValue;
  const baseMap = map<Value>(actualInitialValue);
   // --- End Revised Initialization ---

  let ignoreNextStorageEvent = false; // Flag to prevent echo from self-triggered events

  // Function to write the current map value to storage
  const writeToStorage = (value: Value) => {
    try {
      console.log(`[persistentMap] Encoding value for key "${key}":`, value); // DEBUG
      const encoded = serializer.encode(value);
      console.log(`[persistentMap] Writing to storage key "${key}":`, encoded); // DEBUG
      ignoreNextStorageEvent = true; // Mark that we are causing the potential storage event
      storage.setItem(key, encoded);
    } catch (_error) {
      console.error(`[persistentMap] Error writing to storage key "${key}":`, _error); // DEBUG
    } finally {
      // Reset flag immediately
      ignoreNextStorageEvent = false;
    }
  };

  // If storage was initially empty, write the determined initial value now.
  if (storageIsEmpty) {
    writeToStorage(actualInitialValue);
  }

  // Subscribe to persist future changes immediately after creation.
  subscribe(baseMap, (newValue: Value) => {
      writeToStorage(newValue);
  });

  // Handler for storage events (cross-tab sync)
  const storageEventHandler = (event: StorageEvent) => {
    if (event.key === key && event.storageArea === storage) {
      if (ignoreNextStorageEvent) {
        return; // Ignore event triggered by this instance
      }
      if (event.newValue === null) {
        // Key removed or cleared in another tab
        set(baseMap, initialValue); // Reset to initial value (updates the whole map)
      } else {
        try {
          const decodedValue = serializer.decode(event.newValue);
          // Update the whole map. Consider deep comparison if performance becomes an issue.
          set(baseMap, decodedValue);
        } catch (_error) {}
      }
    }
  };

  // Use onMount to load initial value and set up listeners
  const _unmount = onMount(baseMap, () => {
    // --- Mount ---
    let valueFromStorage: Value | undefined;
    let storageIsEmpty = true; // Determine emptiness inside onMount now
    try {
      const raw = storage.getItem(key);
      if (raw !== null) {
        valueFromStorage = serializer.decode(raw);
        storageIsEmpty = false;
      }
    } catch (_error) {}

    // Set initial value from storage if different from current
    if (!storageIsEmpty && valueFromStorage !== undefined) {
       // Use set() which replaces the whole map content
       // Check if different before setting? Deep compare might be needed.
       // For simplicity, setting unconditionally if storage had value.
       set(baseMap, valueFromStorage);
    } else if (storageIsEmpty) {
      // If nothing in storage, write the current (initial) value
      writeToStorage(get(baseMap));
    }

    // Start listening to core map changes (Now handled outside onMount)

    // Add cross-tab listener if enabled
    if (shouldListen) {
      window.addEventListener('storage', storageEventHandler);
    }

    // --- Unmount ---
    return () => {
      if (shouldListen) {
        window.removeEventListener('storage', storageEventHandler);
      }
      // Stop the core listener? No, persistence should continue.
    };
  });

  // Return the original map store. Its value is managed by the listeners.
  // Functions like setKey will modify the baseMap, triggering the subscribe listener.
  return baseMap;
}

// Removed redundant export
