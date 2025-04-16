// Batching implementation using global prototype patching.
import { Atom, AtomProto } from './core';
// Note: LifecycleListener is not directly used here, but batching interacts with the event system.

// --- Batching Internals ---

/** Tracks the nesting depth of batch calls. */
let batchDepth = 0;
/** Stores atoms that have changed within the current batch. Only mutable atoms are added. */
const batchQueue = new Set<Atom<any>>();

// Store original methods from AtomProto at module load time.
const originalAtomProtoSet = AtomProto.set;
const originalAtomProtoNotify = AtomProto._notify; // Used for final notification

// --- Patched Methods ---

/**
 * Patched `set` method applied to `AtomProto` *during* a batch operation.
 * It updates the value directly, queues the atom for notification,
 * and prevents immediate listener notification.
 */
function patchedSet<T>(this: Atom<T>, value: T, force = false): void {
    const old = this._value;
    if (force || !Object.is(value, old)) {
        // Only store the original value the *first* time an atom is changed within a batch.
        if (!batchQueue.has(this)) {
            // We check existence defensively, though it should only be added once.
            if (!('_oldValueBeforeBatch' in this)) {
                this._oldValueBeforeBatch = old;
            }
            batchQueue.add(this); // Add to queue for later notification
        }
        this._value = value; // Update value directly

        // IMPORTANT: DO NOT trigger `onSet` listeners here within the batch's patched `set`.
        // The event system's `onSet` patch relies on the *original* set (or the batch-patched set)
        // being called. We let the batch function handle notifications *after* the batch completes.
        // If `onSet` needs to fire for batched changes, it would need specific integration
        // within the `batch` function's notification loop, which is currently bypassed.
    }
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
  if (batchDepth === 0) {
    // Entering batch: Patch AtomProto set method ONLY
    AtomProto.set = patchedSet;
  }
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

      // Only process queue and restore prototype if this is the outermost batch call
      if (batchDepth === 0) {
          // --- Start Critical Section: Process Queue & Restore Prototype ---
          try {
              // Only collect changes if the batch function executed without errors.
              if (!errorOccurred && batchQueue.size > 0) {
                  const changedItems = Array.from(batchQueue); // Copy queue before clearing
                  batchQueue.clear(); // Clear queue immediately

                  for (const item of changedItems) {
                      if (!item) continue; // Should not happen with Set, but defensive check

                      // Check if the temporary old value property exists
                      if ('_oldValueBeforeBatch' in item) {
                          const oldValue = item._oldValueBeforeBatch;
                          const currentValue = item._value;
                          delete item._oldValueBeforeBatch; // Clean up temporary property

                          // Only queue for notification if the value actually changed
                          if (!Object.is(currentValue, oldValue)) {
                              changesToNotify.push({ atom: item, value: currentValue, oldValue });
                          }
                      } else {
                          // If _oldValueBeforeBatch doesn't exist (e.g., added but set back to original),
                          // still ensure cleanup just in case, though it shouldn't be necessary.
                          delete item._oldValueBeforeBatch;
                      }
                  }
              } else {
                  // If an error occurred OR the queue was empty,
                  // ensure cleanup of any potentially lingering properties and clear the queue.
                  batchQueue.forEach(item => { if (item) delete item._oldValueBeforeBatch; });
                  batchQueue.clear();
              }
          } finally {
              // **Crucially, always restore the original prototype method**,
              // even if errors occurred during execution or queue processing.
              AtomProto.set = originalAtomProtoSet;
          }
          // --- End Critical Section ---
      }
  }

  // --- Perform Notifications ---
  // This happens *after* the finally block, ensuring the prototype is restored.
  // Only notify if it was the outermost batch call and no error occurred during fn().
  if (batchDepth === 0 && !errorOccurred && changesToNotify.length > 0) {
      for (const change of changesToNotify) {
          try {
              // Call the *original* core notify method directly.
              // This bypasses any event system patches (`onNotify`) during the batch notification phase,
              // ensuring only the core value listeners are triggered by the batch itself.
              originalAtomProtoNotify.call(change.atom, change.value, change.oldValue);
          } catch (err) {
              console.error(`Error during batched notification for atom ${String(change.atom)}:`, err);
          }
      }
  }

  // Return the result of the batch function.
  // Non-null assertion is safe because errors are re-thrown.
  return result!;
}

/**
 * Checks if the code is currently executing within a `batch()` call.
 * @returns True if inside a batch, false otherwise.
 */
export function isInBatch(): boolean {
  return batchDepth > 0;
}