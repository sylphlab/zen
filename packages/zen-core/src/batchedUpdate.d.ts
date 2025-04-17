/**
 * Batches multiple function calls into a single execution within a microtask.
 * If the returned function is called multiple times within the same microtask tick,
 * the original function `fn` will only be executed once.
 *
 * Inspired by Nanostores `batched`.
 *
 * @param fn The function to batch.
 * @returns A function that schedules `fn` to run in a microtask.
 */
export declare function batchedUpdate(fn: () => void): () => void;
