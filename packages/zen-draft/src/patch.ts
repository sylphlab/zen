import type { Patch } from './types';
import { isDraftable, isMap, isSet } from './utils';

// Applies JSON patches to a state immutably
export function applyPatches<T>(baseState: T, patches: Patch[]): T | undefined { // Allow undefined return
  if (!patches.length) {
    return baseState;
  }

  // Implement lazy Copy-on-Write within applyPatches
  let currentState: T | undefined = baseState; // Start with base state
  const copies = new Map<object, object>(); // Track copies made during this application

  // Helper to safely get a value by path array
  const getValueByPath = (target: unknown, path: (string | number)[]): unknown => {
    let current: unknown = target;
    for (const segment of path) {
      if (current === null || typeof current !== 'object' || segment === undefined) {
        return undefined;
      }
      if (isMap(current)) {
        current = current.get(segment);
      } else if (isSet(current)) {
        return undefined; // Cannot traverse *into* a Set via path segment
      } else if (typeof segment === 'string' || typeof segment === 'number') {
        // Safely index after checking it's an object
        current = (current as Record<string | number, unknown>)[segment];
      } else {
        return undefined; // Invalid segment type
      }
    }
    return current;
  };

  // Helper to get mutable copy for a specific object within the current state
  const ensureMutable = <O extends object>(obj: O): O => {
    if (!isDraftable(obj) || copies.has(obj)) {
      return (copies.get(obj) as O) ?? obj;
    }
    let copy: O;
    if (Array.isArray(obj)) {
      copy = [...obj] as O;
    } else if (isMap(obj)) {
      copy = new Map(obj as Map<unknown, unknown>) as O;
    } else if (isSet(obj)) {
      copy = new Set(obj as Set<unknown>) as O;
    } else {
      // Plain object
      copy = { ...obj };
    }
    copies.set(obj, copy);
    return copy;
  };

  for (const patch of patches) {
    const path = patch.path;
    if (path.length === 0) {
      // Handle root operations
      if (patch.op === 'replace' || patch.op === 'add') {
        currentState = patch.value as T;
      } else if (patch.op === 'remove') {
        currentState = undefined;
      } else if (patch.op === 'test') {
        if (JSON.stringify(currentState) !== JSON.stringify(patch.value)) {
          throw new Error(`'test' operation failed at root path.`);
        }
      } else {
        // Ignore other ops at root for now
      }
      continue;
    }

    // --- Path Traversal with Correct CoW ---
    let currentLevel: any = currentState;
    let parentRef: any = null; // Keep track of the parent object/array
    let segmentForParent: string | number | undefined = undefined; // Re-declare variable

    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];

      if (currentLevel === null || typeof currentLevel !== 'object') {
        // Cannot traverse further, path is invalid for non-test ops
        if (patch.op === 'test') {
           const currentValue = getValueByPath(currentState, patch.path);
           const valuesAreEqual = JSON.stringify(currentValue) === JSON.stringify(patch.value);
           if (!valuesAreEqual) {
             throw new Error(`'test' operation failed at path: ${patch.path.join('/')}`);
           }
           // Test passed or failed, but we can't apply other ops, so break loop for this patch
           currentLevel = undefined; // Mark as invalid path for subsequent steps
           break;
        }
        // Removed redundant else block that caused Biome error
        console.warn(`Invalid path segment ${segment} in patch:`, patch);
        currentLevel = undefined; // Mark as invalid path
        break;
      }

      // Ensure current level is mutable *before* accessing the child
      const originalLevel = currentLevel;
      currentLevel = ensureMutable(currentLevel as object);

      // If a copy was made, update the reference in the parent or the root state
      if (currentLevel !== originalLevel) {
        if (parentRef === null) { // This means currentLevel was the root state
          currentState = currentLevel as T;
        } else if (segmentForParent !== undefined) { // Check segmentForParent is defined
           // Update the parent's reference to the new copy
           if (isMap(parentRef)) {
             parentRef.set(segmentForParent, currentLevel);
           } else {
              (parentRef as Record<string | number, unknown>)[segmentForParent] = currentLevel;
           }
        }
      }

      // Get the next level value
      let nextLevel = undefined;
      if (segment !== undefined) { // Check segment before using as index
         nextLevel = isMap(currentLevel)
           ? currentLevel.get(segment)
           : (currentLevel as Record<string | number, unknown>)[segment];
      }


      // If the next level doesn't exist for an 'add' or 'replace' op, create it (if possible)
      if (segment !== undefined && nextLevel === undefined && (patch.op === 'add' || patch.op === 'replace')) {
         const nextSegment = path[i + 1];
         if (typeof nextSegment === 'number' || nextSegment === '-') {
             nextLevel = []; // Assume array if next segment is number or '-'
         } else {
             nextLevel = {}; // Assume object otherwise
         }
         if (isMap(currentLevel)) {
             currentLevel.set(segment, nextLevel);
         } else { // Check segment before using as index
             (currentLevel as Record<string | number, unknown>)[segment] = nextLevel;
         }
         // Ensure the newly created level is also marked as mutable/copied
         nextLevel = ensureMutable(nextLevel as object);
         if (isMap(currentLevel)) {
             currentLevel.set(segment, nextLevel);
         } else { // Check segment before using as index
             (currentLevel as Record<string | number, unknown>)[segment] = nextLevel;
         }
      }


      // Update parent references for the next iteration
      parentRef = currentLevel;
      segmentForParent = segment; // Assign segment for next iteration's parent update
      currentLevel = nextLevel; // Move to the next level
    }

    // After loop, parentRef holds the direct parent of the target
    // targetSegment holds the final key/index

    // Check if path traversal failed (excluding 'test' op which might have broken early)
    if (currentLevel === undefined && patch.op !== 'test') {
       // Path was invalid for this operation, skip patch
       continue;
    }

    // Ensure the final target container (parent) is mutable
    // If parentRef is null, it means the operation is on the root (path length 1)
    const mutableParent = parentRef === null ? ensureMutable(currentLevel as object) : ensureMutable(parentRef as object);
    // Update root state if the root itself was copied
    if (parentRef === null && mutableParent !== currentState) {
       currentState = mutableParent as T;
    }

    const targetSegment = path[path.length - 1];

    if (targetSegment === undefined) {
      // Check specifically for undefined segment
      continue;
    }

    // Apply the operation on the mutableParent
    switch (patch.op) {
      case 'add':
      case 'replace': {
        let valueToApply = patch.value;

        // Handle replacing a Set with an array representation
        if (patch.op === 'replace') {
          let currentValueAtPath: unknown;
          if (isMap(mutableParent)) {
            currentValueAtPath = mutableParent.get(targetSegment);
          } else if (typeof mutableParent === 'object') {
            currentValueAtPath = (mutableParent as Record<string | number, unknown>)[targetSegment];
          } else {
            currentValueAtPath = undefined;
          }

          if (isSet(currentValueAtPath) && Array.isArray(valueToApply)) {
            valueToApply = new Set(valueToApply);
          }
        }

        if (Array.isArray(mutableParent) && targetSegment === '-') {
           mutableParent.push(valueToApply);
        } else if (Array.isArray(mutableParent) && typeof targetSegment === 'number') {
          if (patch.op === 'add') {
            mutableParent.splice(targetSegment, 0, valueToApply);
          } else { // replace
            if (targetSegment < mutableParent.length) {
              mutableParent[targetSegment] = valueToApply;
            }
          }
        } else if (isMap(mutableParent)) {
          mutableParent.set(targetSegment, valueToApply);
        } else if (typeof mutableParent === 'object') {
          (mutableParent as Record<string | number, unknown>)[targetSegment] = valueToApply;
        }
        break;
      }
      case 'remove':
        if (Array.isArray(mutableParent) && typeof targetSegment === 'number') {
          if (targetSegment < mutableParent.length) {
            mutableParent.splice(targetSegment, 1);
          }
        } else if (isMap(mutableParent)) {
          mutableParent.delete(targetSegment);
        } else if (isSet(mutableParent)) {
           // Ignore standard 'remove' for Sets, use 'set_delete'
        } else if (typeof mutableParent === 'object') {
          delete (mutableParent as Record<string | number, unknown>)[targetSegment];
        }
        break;
      case 'move': {
        if (!patch.from || !patch.path) {
          throw new Error(`'move' requires 'from' and 'path'.`);
        }
        if (patch.from.join('/') === patch.path.join('/')) break; // No-op

        const valueToMove = getValueByPath(currentState, patch.from);

        // Check source path existence robustly
        let fromParentCheck: unknown = currentState;
        let sourceExists = true;
        let sourceParentRef: any = null;
        let sourceSegment: string | number | undefined = undefined;
        for (let i = 0; i < patch.from.length; i++) {
          const seg = patch.from[i];
          if (fromParentCheck === null || typeof fromParentCheck !== 'object' || seg === undefined) {
            sourceExists = false; break;
          }
          sourceParentRef = fromParentCheck; // Store potential parent
          sourceSegment = seg; // Store potential segment

          if (isMap(fromParentCheck)) {
            if (!fromParentCheck.has(seg)) { sourceExists = false; break; }
            fromParentCheck = fromParentCheck.get(seg);
          } else if (isSet(fromParentCheck)) {
            sourceExists = false; break;
          } else if (!(seg in fromParentCheck)) {
             sourceExists = false; break;
          } else {
            fromParentCheck = (fromParentCheck as Record<string | number, unknown>)[seg];
          }
        }
        if (!sourceExists || sourceParentRef === null || sourceSegment === undefined) {
          throw new Error(`'move' operation source path does not exist or is invalid: ${patch.from.join('/')}`);
        }

        // Ensure source parent is mutable and perform remove
        const mutableSourceParent = ensureMutable(sourceParentRef as object);
        if (sourceParentRef === currentState && mutableSourceParent !== currentState) {
           currentState = mutableSourceParent as T; // Update root if source parent was root and copied
        }
        if (Array.isArray(mutableSourceParent) && typeof sourceSegment === 'number') {
           if (sourceSegment < mutableSourceParent.length) mutableSourceParent.splice(sourceSegment, 1);
        } else if (isMap(mutableSourceParent)) {
           mutableSourceParent.delete(sourceSegment);
        } else if (typeof mutableSourceParent === 'object') {
           delete (mutableSourceParent as Record<string | number, unknown>)[sourceSegment];
        }

        // Apply add operation to the target mutable parent
        if (Array.isArray(mutableParent) && targetSegment === '-') {
           mutableParent.push(valueToMove);
        } else if (Array.isArray(mutableParent) && typeof targetSegment === 'number') {
           mutableParent.splice(targetSegment, 0, valueToMove);
        } else if (isMap(mutableParent)) {
           mutableParent.set(targetSegment, valueToMove);
        } else if (typeof mutableParent === 'object') {
           (mutableParent as Record<string | number, unknown>)[targetSegment] = valueToMove;
        }
        break;
      }
      case 'copy': {
        if (!patch.from || !patch.path) {
          throw new Error(`'copy' requires 'from' and 'path'.`);
        }
        const valueToCopy = getValueByPath(currentState, patch.from);

        // Check source path existence robustly (similar to 'move')
        let existsCheck: unknown = currentState;
        let sourceExists = true;
         for (let i = 0; i < patch.from.length; i++) {
          const seg = patch.from[i];
          if (existsCheck === null || typeof existsCheck !== 'object' || seg === undefined) {
            sourceExists = false; break;
          }
          if (isMap(existsCheck)) {
             if (!existsCheck.has(seg)) { sourceExists = false; break; }
             if (i < patch.from.length - 1) existsCheck = existsCheck.get(seg);
          } else if (isSet(existsCheck)) {
             sourceExists = false; break;
          } else if (!(seg in existsCheck)) {
             sourceExists = false; break;
          } else {
             if (i < patch.from.length - 1) existsCheck = (existsCheck as Record<string | number, unknown>)[seg];
          }
        }
        if (!sourceExists) {
          throw new Error(`'copy' operation source path does not exist: ${patch.from.join('/')}`);
        }

        const clonedValue = structuredClone(valueToCopy); // Deep clone for copy

        // Apply add operation to the target mutable parent
         if (Array.isArray(mutableParent) && targetSegment === '-') {
           mutableParent.push(clonedValue);
        } else if (Array.isArray(mutableParent) && typeof targetSegment === 'number') {
           mutableParent.splice(targetSegment, 0, clonedValue);
        } else if (isMap(mutableParent)) {
           mutableParent.set(targetSegment, clonedValue);
        } else if (typeof mutableParent === 'object') {
           (mutableParent as Record<string | number, unknown>)[targetSegment] = clonedValue;
        }
        break;
      }
      // 'test' is handled during path traversal
      case 'set_add':
        if (isSet(mutableParent)) {
          mutableParent.add(patch.value);
        }
        break;
      case 'set_delete':
        if (isSet(mutableParent)) {
          mutableParent.delete(patch.value);
        }
        break;
      default:
         console.warn(`Unsupported patch operation: ${(patch as Patch).op}`);
    }
  } // End for(const patch of patches)

  // Auto-freeze logic is handled by the caller (e.g., produce function)

  return currentState as T;
}