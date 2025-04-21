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
export function batchedUpdate(fn: () => void): () => void {
  let microtaskScheduled = false;

  const runFn = () => {
    microtaskScheduled = false;
    try {
      fn();
    } catch (_error) {
      console.error('Error during batched callback execution:', _error); // Log error (Matching test expectation)
    }
  };

  return () => {
    if (!microtaskScheduled) {
      microtaskScheduled = true;
      queueMicrotask(runFn);
    }
  };
}
