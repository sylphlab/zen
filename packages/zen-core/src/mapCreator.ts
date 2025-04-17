import { map } from './map'; // Import the map factory function
import type { MapAtom } from './types'; // Import MapAtom type

// Type for the initializer function passed to mapCreator
// It receives the newly created store and the ID (and potentially other args)
type MapInitializer<T extends object, ID = string, Args extends any[] = any[]> = (
    store: MapAtom<T>,
    id: ID,
    ...args: Args
) => void;

// Type for the function returned by mapCreator
type StoreInstanceCreator<T extends object, ID = string, Args extends any[] = any[]> = (
    id: ID,
    ...args: Args
) => MapAtom<T>;

/**
 * Creates a factory function for generating map stores with shared initialization logic.
 * Useful for scenarios like ORMs or collections where many stores share a similar setup process.
 * Includes caching based on the provided ID.
 *
 * @template T The type of the object state managed by the map stores.
 * @template ID The type of the identifier used for caching and initialization (default: string).
 * @template Args The type of additional arguments passed to the initializer.
 * @param initializer A function that receives the newly created store instance and the ID (plus any extra args)
 *                    to perform initialization logic (e.g., setting initial state, fetching data).
 * @returns A function that takes an ID (and optional extra args) and returns a MapAtom instance.
 */
export function mapCreator<T extends object, ID = string, Args extends any[] = any[]>(
    initializer: MapInitializer<T, ID, Args>
): StoreInstanceCreator<T, ID, Args> {
    // Cache to store created instances, keyed by ID
    const cache = new Map<ID, MapAtom<T>>();

    // The factory function returned to the user
    const createStoreInstance: StoreInstanceCreator<T, ID, Args> = (id: ID, ...args: Args): MapAtom<T> => {
        // Check cache first
        if (cache.has(id)) {
            return cache.get(id)!;
        }

        // Create a new map store with an empty initial object
        // The initializer is responsible for setting the actual initial state
        const store = map<T>({} as T); // Start empty, initializer sets content

        // Store in cache *before* running initializer to handle potential recursive calls
        cache.set(id, store);

        try {
            // Run the provided initializer logic
            initializer(store, id, ...args);
        } catch (error) {
            console.error(`Error during mapCreator initializer for ID "${String(id)}":`, error);
            // Optionally: remove from cache if initialization fails?
            // cache.delete(id);
            // Or set an error state in the store? Depends on desired behavior.
        }

        return store;
    };

    return createStoreInstance;
}