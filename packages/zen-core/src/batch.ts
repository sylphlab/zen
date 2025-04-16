// Batching implementation without global prototype patching.
import { Atom, Listener, notifyListeners } from './core'; // Import notifyListeners from core

// --- Batching Internals ---

/** Tracks the nesting depth of batch calls. Exported for direct check in atom.ts. @internal */
export let batchDepth = 0;
/** Stores atoms that have changed within the current batch, along with their original value. */
const batchQueue = new Map<Atom<any>, any>(); // Map<Atom, OriginalValueBeforeBatch>

// --- Internal Functions (Exported for core.ts) ---

/**
 * Checks if the code is currently executing within a `batch()` call.
 * Exported for use in `core.ts`.
 * @returns True if inside a batch, false otherwise.
 * @internal
 */
export function isInBatch(): boolean {
  return batchDepth > 0;
}

/**
 * Queues an atom for notification at the end of the batch.
 * Stores the original value before the batch started if it's the first change for this atom in the batch.
 * Exported for use in `core.ts`.
 * @param atom The atom that changed.
 * @param originalValue The value the atom had *before* the current `set` call triggering this queue.
 * @internal
 */
export function queueAtomForBatch<T>(atom: Atom<T>, originalValue: T): void {
  // Only store the original value the *first* time an atom is queued in a batch.
  if (!batchQueue.has(atom)) {
    batchQueue.set(atom, originalValue);
  }
  // Subsequent calls for the same atom within the batch don't need to update the map,
  // as we only care about the value *before* the batch started for the final notification.
}


// --- Exported Batch Function ---

/**
 * Executes a function, deferring all atom listener notifications until the function completes.
 * This prevents multiple notifications for rapid changes to the same atom within the function.
 * Batches can be nested; notifications only run when the outermost batch finishes.
 * @param fn The function to execute within the batch.
 * @returns The return value of the executed function.
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;

  let errorOccurred = false;
  let result: T;
  // Stores details of atoms that actually changed value for final notification.
  let changesToNotify: { atom: Atom<any>; value: any; oldValue: any }[] = [];

  try {
      result = fn(); // Execute the provided function
  } catch (e) {
      errorOccurred = true;
      throw e; // Re-throw the error after cleanup (in finally)
  } finally {
      batchDepth--;

      // Only process queue if this is the outermost batch call
      if (batchDepth === 0) {
          // --- Start Critical Section: Process Queue ---
          try {
              // Only collect changes if the batch function executed without errors.
              if (!errorOccurred && batchQueue.size > 0) {
                  // Iterate directly over the map entries
                  for (const [atom, originalValueBeforeBatch] of batchQueue.entries()) {
                      const currentValue = atom._value; // Get the final value after the batch

                      // Only queue for notification if the value actually changed from before the batch
                      if (!Object.is(currentValue, originalValueBeforeBatch)) {
                          changesToNotify.push({ atom: atom, value: currentValue, oldValue: originalValueBeforeBatch });
                      }
                  }
              }
          } finally {
              // **Crucially, always clear the queue** after processing or if an error occurred.
              batchQueue.clear();
          }
          // --- End Critical Section ---
      }
  }

  // --- Perform Notifications ---
  // This happens *after* the finally block.
  // Only notify if it was the outermost batch call and no error occurred during fn().
  if (batchDepth === 0 && !errorOccurred && changesToNotify.length > 0) {
      for (const change of changesToNotify) {
          try {
              // Call the exported notifyListeners function directly.
              notifyListeners(change.atom, change.value, change.oldValue);
          } catch (err) {
              console.error(`Error during batched notification for atom ${String(change.atom)}:`, err);
          }
      }
  }

  // Return the result of the batch function.
  // Non-null assertion is safe because errors are re-thrown.
  return result!;
}

// Note: isInBatch is already exported above.