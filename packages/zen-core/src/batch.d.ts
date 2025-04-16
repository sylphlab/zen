/**
 * Executes a function, deferring all atom listener notifications until the function completes.
 * This prevents multiple notifications for rapid changes to the same atom within the function.
 * Batches can be nested; notifications only run when the outermost batch finishes.
 * @param fn The function to execute within the batch.
 * @returns The return value of the executed function.
 */
export declare function batch<T>(fn: () => T): T;
/**
 * Checks if the code is currently executing within a `batch()` call.
 * @returns True if inside a batch, false otherwise.
 */
export declare function isInBatch(): boolean;
