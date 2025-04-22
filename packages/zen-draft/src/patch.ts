import { produce } from './produce'; // Import produce
import type { Patch } from './types';
import { deepEqual, isDraftable, isMap, isSet } from './utils'; // Import deepEqual

// deepEqual function moved to utils.ts

// Helper to safely get a value by path array from a draft
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
      current = (current as Record<string | number, unknown>)[segment];
    } else {
      return undefined; // Invalid segment type
    }
  }
  return current;
};

/**
 * Traverses the draft object according to the path, auto-creating nodes if necessary for 'add'/'replace'.
 * Returns the parent node of the final segment, or null if path is invalid.
 * @internal
 */
function _traverseAndCreatePath<T>(
  draft: T,
  path: (string | number)[],
  op: 'add' | 'replace' | 'remove',
): T | null {
  let current = draft;
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    if (current === null || typeof current !== 'object' || segment === undefined) {
      return null; // Invalid path
    }

    let next = isMap(current)
      ? current.get(segment)
      : (current as Record<string | number, unknown>)[segment];

    // Auto-create path segments if they don't exist for add/replace
    if (
      (op === 'add' || op === 'replace') &&
      (next === undefined || next === null || typeof next !== 'object')
    ) {
      const nextSegment = path[i + 1];
      next = typeof nextSegment === 'number' || nextSegment === '-' ? [] : {};
      if (isMap(current)) {
        current.set(segment, next);
      } else {
        (current as Record<string | number, unknown>)[segment] = next;
      }
    } else if (next === undefined || next === null || typeof next !== 'object') {
      // Path doesn't exist for remove or is invalid type for traversal
      return null;
    }

    current = next as T; // Continue traversal
  }
  return current; // Return the parent node
}


// Helper to safely set a value by path array within a draft
// Returns true if successful, false otherwise
const setValueByPath = <T>(
  // Add baseState type
  baseState: T, // Pass original base state for type checking
  draft: T, // Use generic type T instead of any
  path: (string | number)[],
  value: unknown,
  // Simplify op type - move/copy logic moved to applyPatches
  op: 'add' | 'replace' | 'remove',
): boolean => {
  if (path.length === 0) {
    // Cannot set root directly this way, handled separately
    return false;
  }

  // Traverse path to find the parent node, creating intermediate nodes if needed
  const parentNode = _traverseAndCreatePath(draft, path, op);

  // If traversal failed (invalid path), return false
  if (parentNode === null) {
    return false;
  }

  const finalSegment = path[path.length - 1];
  if (finalSegment === undefined) return false;

  // Apply final operation using helper
  return _applyFinalOperation(parentNode, finalSegment, value, op, baseState, path);
};

/** @internal Handles the 'remove' operation for _applyFinalOperation. */
function _applyRemoveOperation<T>(current: T, finalSegment: string | number): boolean {
  if (Array.isArray(current) && typeof finalSegment === 'number') {
    if (finalSegment < current.length) {
      current.splice(finalSegment, 1);
      return true;
    }
  } else if (isMap(current)) {
    return current.delete(finalSegment);
  } else if (typeof current === 'object' && current !== null) {
    delete (current as Record<string | number, unknown>)[finalSegment];
    return true;
  }
  return false;
}

/** @internal Handles the 'add'/'replace' operation for Arrays in _applyFinalOperation. */
function _applyAddOrReplaceArray(
  current: unknown[],
  finalSegment: string | number,
  valueToApply: unknown,
  op: 'add' | 'replace',
): boolean {
  if (finalSegment === '-') {
    current.push(valueToApply); // Append for '-' path
    return true;
  }
  if (typeof finalSegment === 'number') {
    if (op === 'add') {
      current.splice(finalSegment, 0, valueToApply); // Insert at index
    } else { // replace
      if (finalSegment < current.length) {
        current[finalSegment] = valueToApply; // Replace existing index
      } else {
        return false; // Cannot replace outside bounds
      }
    }
    return true;
  }
  return false; // Invalid segment for array
}

/** @internal Handles the 'add'/'replace' operation for Maps in _applyFinalOperation. */
function _applyAddOrReplaceMap(
  current: Map<unknown, unknown>,
  finalSegment: string | number,
  valueToApply: unknown,
): boolean {
  current.set(finalSegment, valueToApply);
  return true;
}

/** @internal Handles the 'add'/'replace' operation for Objects in _applyFinalOperation. */
function _applyAddOrReplaceObject(
  current: object,
  finalSegment: string | number,
  valueToApply: unknown,
): boolean {
  if (typeof current === 'object' && current !== null) {
    (current as Record<string | number, unknown>)[finalSegment] = valueToApply;
    return true;
  }
  return false;
}


/**
 * Applies the final patch operation (add, replace, remove) to the target node.
 * @internal
 */
function _applyFinalOperation<T>(
  current: T, // The parent node (draft)
  finalSegment: string | number,
  value: unknown,
  op: 'add' | 'replace' | 'remove',
  baseState: T, // Original base state for type checks
  path: (string | number)[], // Full path for context
): boolean {
  if (op === 'remove') {
    return _applyRemoveOperation(current, finalSegment);
  }

  // Handle 'add' or 'replace'
  let valueToApply = value;
  if (op === 'replace') {
    const originalValue = getValueByPath(baseState, path);
    if (isSet(originalValue) && Array.isArray(valueToApply)) {
      valueToApply = new Set(valueToApply);
    }
    // Add similar checks for Map if needed
  }

  if (Array.isArray(current)) {
    return _applyAddOrReplaceArray(current, finalSegment, valueToApply, op);
  }
  if (isMap(current)) {
    // Map needs explicit type check before helper
    return _applyAddOrReplaceMap(current, finalSegment, valueToApply);
  }
  if (typeof current === 'object' && current !== null) {
    // Check for plain object before helper
    return _applyAddOrReplaceObject(current, finalSegment, valueToApply);
  }

  return false; // Operation failed if target type is not handled
}

// --- applyPatches Helper Functions ---

/** @internal Applies add/replace/remove patches. */
function _applyModifyPatch<T>(patch: Patch, baseState: T, draft: T): void {
  // Optional: Check success? For now, assume setValueByPath handles errors/warnings internally if needed.
  setValueByPath(baseState, draft, patch.path, patch.value, patch.op as 'add' | 'replace' | 'remove');
}

/** @internal Applies move patches. */
function _applyMovePatch<T>(patch: Patch, baseState: T, draft: T): void {
  if (!patch.from) throw new Error("Move patch missing 'from' path");
  const valueToMove = getValueByPath(draft, patch.from);
  // Check source existence more robustly? For now, rely on setValueByPath errors.
  if (valueToMove === undefined && getValueByPath(baseState, patch.from) === undefined) {
    throw new Error(`'move' operation source path does not exist or is invalid: ${patch.from.join('/')}`);
  }
  const removeSuccess = setValueByPath(baseState, draft, patch.from, undefined, 'remove');
  if (!removeSuccess) {
    throw new Error(`'move' operation failed during remove phase: ${patch.from.join('/')}`);
  }
  // Optional: Check addSuccess?
  setValueByPath(baseState, draft, patch.path, valueToMove, 'add');
}

/** @internal Applies copy patches. */
function _applyCopyPatch<T>(patch: Patch, baseState: T, draft: T): void {
  if (!patch.from) throw new Error("Copy patch missing 'from' path");
  const valueToCopy = getValueByPath(draft, patch.from);
  if (valueToCopy === undefined && getValueByPath(baseState, patch.from) === undefined) {
    throw new Error(`'copy' operation source path does not exist or is invalid: ${patch.from.join('/')}`);
  }
  // Use JSON clone for simplicity
  const clonedValue = JSON.parse(JSON.stringify(valueToCopy ?? null));
  // Optional: Check addSuccess?
  setValueByPath(baseState, draft, patch.path, clonedValue, 'add');
}

/** @internal Applies set_add patches. */
function _applySetAddPatch<T>(patch: Patch, draft: T): void {
  const targetSet = getValueByPath(draft, patch.path);
  if (isSet(targetSet)) {
    targetSet.add(patch.value);
  }
  // Optional: Warn or error if target is not a Set?
}

/** @internal Applies set_delete patches. */
function _applySetDeletePatch<T>(patch: Patch, draft: T): void {
  const targetSet = getValueByPath(draft, patch.path);
  if (isSet(targetSet)) {
    targetSet.delete(patch.value);
  }
  // Optional: Warn or error if target is not a Set?
}

/** @internal Handles root path operations within applyPatches produce recipe. */
function _handleRootOperation(patch: Patch): void {
  if (patch.op === 'replace' || patch.op === 'add') {
    throw new Error('Root replacement/addition via applyPatches is not supported. Use produce directly.');
  }
  if (patch.op === 'remove') {
    throw new Error('Root removal via applyPatches is not supported.');
  }
  // move/copy at root doesn't make sense and is implicitly disallowed by path check
}


// --- applyPatches Function ---

// Applies JSON patches to a state immutably using produce
export function applyPatches<T>(baseState: T, patches: Patch[]): T {
  if (!patches.length) {
    return baseState;
  }

  // 1. Perform all 'test' operations first
  for (const patch of patches) {
    if (patch.op === 'test') {
      const currentValue = getValueByPath(baseState, patch.path);
      if (!deepEqual(currentValue, patch.value)) {
        throw new Error(
          `'test' operation failed at path: ${patch.path.join('/')}. Expected ${JSON.stringify(patch.value)}, got ${JSON.stringify(currentValue)}`,
        );
      }
    }
  }

  // 2. Apply remaining patches using produce
  const [finalState] = produce<T>(baseState, (draft) => {
    // Use single generic
    for (const patch of patches) {
      if (patch.op === 'test') continue; // Skip test ops

      if (patch.path.length === 0) {
        _handleRootOperation(patch); // Handle root ops (throws errors)
        continue; // Should not be reached if root op is valid (move/copy)
      }

      switch (patch.op) {
        case 'add':
        case 'replace':
        case 'remove':
          _applyModifyPatch(patch, baseState, draft);
          break;
        case 'move':
          _applyMovePatch(patch, baseState, draft);
          break;
        case 'copy':
          _applyCopyPatch(patch, baseState, draft);
          break;
        case 'set_add':
          _applySetAddPatch(patch, draft);
          break;
        case 'set_delete':
          _applySetDeletePatch(patch, draft);
          break;
        // No default needed as 'test' is handled earlier and Patch['op'] is exhaustive
      }
    }
    // Explicitly return undefined to satisfy the recipe type T | undefined
    return undefined;
  });

  // Assert finalState as T because produce guarantees non-undefined return
  // when the recipe doesn't return a value and baseState is not undefined.
  return finalState as T;
}
