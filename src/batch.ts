// Batching implementation using global prototype patching (v7 - Revised Notification v2)
import { Atom, ReadonlyAtom, Listener, AtomProto } from './core';
import type { LifecycleListener } from './events';

// --- Batching Internals ---
let batchDepth = 0;
const batchQueue = new Set<Atom<any>>(); // Only queue mutable atoms

// Store original methods from AtomProto
const originalAtomProtoSet = AtomProto.set;
const originalAtomProtoNotify = AtomProto._notify; // Store original core notify

// --- Patched Methods ---

// Patched set method for AtomProto during batch
function patchedSet<T>(this: Atom<T>, v: T, force = false) {
    const old = this._value;
    if (force || !Object.is(v, old)) {
        if (!batchQueue.has(this)) {
            // Store old value ONLY if adding for the first time
            if (!('_oldValueBeforeBatch' in this)) {
                this._oldValueBeforeBatch = old;
            }
            batchQueue.add(this);
        }
        this._value = v; // Update value directly
        // DO NOT trigger onSet listeners inside batch's patchedSet
        // (this._setListeners as Set<LifecycleListener<T>> | undefined)?.forEach((fn: LifecycleListener<T>) => { try { fn(v); } catch(e) { console.error(e); } });
    }
}

// _notifyBatch method is removed

// --- Exported Batch Function ---
export function batch<T>(fn: () => T): T {
  if (batchDepth === 0) {
    // Entering batch: Patch AtomProto set method ONLY
    AtomProto.set = patchedSet;
  }
  batchDepth++;

  let errorOccurred = false;
  let result: T;
  let changesToNotify: { atom: Atom<any>, v: any, old: any }[] = []; // Moved outside try/finally

  try {
      result = fn();
  } catch (e) {
      errorOccurred = true;
      // Clear the queue and cleanup temporary properties on error
      batchQueue.forEach(item => { if (item) delete item._oldValueBeforeBatch; });
      batchQueue.clear();
      throw e; // Re-throw the error
  } finally {
      batchDepth--;
      if (batchDepth === 0) {
          // Exiting batch: Collect changes ONLY if no error occurred, then restore AtomProto
          try {
              // Only collect changes if the batch completed without errors
              if (!errorOccurred && batchQueue.size > 0) {
                  const items = Array.from(batchQueue);
                  batchQueue.clear(); // Clear queue after getting items
                  for (let i = 0; i < items.length; i++) {
                      const item = items[i];
                      if (!item) continue;
                      // Collect change details if old value exists
                      if ('_oldValueBeforeBatch' in item) {
                          const old = item._oldValueBeforeBatch;
                          const v = item._value;
                          delete item._oldValueBeforeBatch; // Clean up the temporary property
                          if (!Object.is(v, old)) {
                              changesToNotify.push({ atom: item, v, old });
                          }
                      } else {
                           // Clean up even if no change was detected (e.g., set to same value)
                           delete item._oldValueBeforeBatch;
                      }
                  }
              } else {
                  // Ensure queue is clear and cleanup even if no notifications needed
                  batchQueue.forEach(item => { if (item) delete item._oldValueBeforeBatch; });
                  batchQueue.clear();
              }
          } finally {
              // ALWAYS restore original methods, regardless of errors
              AtomProto.set = originalAtomProtoSet;
          }
      }
  }

  // Perform notifications AFTER restoring prototype and exiting finally block
  // Only notify if it was the outermost batch call and no error occurred
  if (batchDepth === 0 && !errorOccurred && changesToNotify.length > 0) {
      for (const change of changesToNotify) {
          try {
              // Call original core notify, bypassing any event patches
              originalAtomProtoNotify.call(change.atom, change.v, change.old);
          } catch (err) {
              console.error("Error during batched notification:", err);
          }
      }
  }

  // Need to return result outside the try/finally
  return result!; // Non-null assertion ok because error is re-thrown
}

/** Checks if currently inside a batch operation. */
export function isInBatch(): boolean {
  return batchDepth > 0;
}