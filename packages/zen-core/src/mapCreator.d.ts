import type { MapAtom } from './types';
type MapInitializer<T extends object, ID = string, Args extends any[] = any[]> = (
  store: MapAtom<T>,
  id: ID,
  ...args: Args
) => void;
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
export declare function mapCreator<T extends object, ID = string, Args extends any[] = any[]>(
  initializer: MapInitializer<T, ID, Args>,
): StoreInstanceCreator<T, ID, Args>;
