// --- Type Guards ---

/** Checks if a value is an object or array that can be drafted (proxied). */
export function isDraftable(value: unknown): value is object {
  return (
    value !== null &&
    typeof value === 'object' &&
    // Exclude specific types that shouldn't be drafted directly
    !(value instanceof Date) &&
    !(value instanceof RegExp) &&
    !(value instanceof Promise) &&
    !(value instanceof Map) && // Maps are handled specially
    !(value instanceof Set) // Sets are handled specially
    // Add other non-draftable types if needed
  );
}

/** Checks if a value is a Map. */
export function isMap(value: unknown): value is Map<unknown, unknown> {
  return value instanceof Map;
}

/** Checks if a value is a Set. */
export function isSet(value: unknown): value is Set<unknown> {
  return value instanceof Set;
}

// --- Auto-Freeze Implementation ---
export function deepFreeze(obj: unknown) {
  // Avoid freezing non-objects or already frozen objects
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return;
  }

  // Avoid freezing specific types that shouldn't be frozen
  if (
    obj instanceof Date ||
    obj instanceof RegExp ||
    obj instanceof Map ||
    obj instanceof Set ||
    obj instanceof Promise
  ) {
    return;
  }

  // Basic freeze for objects/arrays:
  if (Array.isArray(obj) || Object.getPrototypeOf(obj) === Object.prototype) {
    Object.freeze(obj);
    // Recursively freeze properties/elements
    for (const key of Object.keys(obj)) {
      // Use type assertion after check
      deepFreeze((obj as Record<string, unknown>)[key]);
    }
  }
  // Note: This basic deepFreeze might not cover all edge cases handled by Immer's freeze.
}
// --- End Auto-Freeze ---

// --- Deep Equality Check Helpers ---

/** @internal Compares two Map objects deeply. */
function _deepEqualMaps(a: Map<unknown, unknown>, b: Map<unknown, unknown>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    // Use deepEqual recursively for values
    if (!b.has(key) || !deepEqual(value, b.get(key))) {
      return false;
    }
  }
  return true;
}

/** @internal Compares two Set objects deeply. */
function _deepEqualSets(a: Set<unknown>, b: Set<unknown>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    // This simple check might be insufficient for sets of objects if order matters
    // or if object equality needs deeper comparison within the set context.
    // For now, it relies on deepEqual finding an equivalent value in the other set.
    let found = false;
    for (const bValue of b) {
      if (deepEqual(value, bValue)) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

/** @internal Compares two Arrays or plain Objects deeply. */
function _deepEqualArraysOrObjects(a: object, b: object): boolean {
  // Filter keys to only strings/numbers for indexing
  const keysA = Reflect.ownKeys(a).filter(
    (k) => typeof k === 'string' || typeof k === 'number',
  ) as (string | number)[];
  const keysB = Reflect.ownKeys(b).filter(
    (k) => typeof k === 'string' || typeof k === 'number',
  ) as (string | number)[];

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Check if key sets are identical first
  const keysASet = new Set(keysA);
  for (const keyB of keysB) {
    if (!keysASet.has(keyB)) {
      return false;
    }
  }

  for (const key of keysA) {
    // Use deepEqual recursively for values
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !deepEqual(
        (a as Record<string | number, unknown>)[key],
        (b as Record<string | number, unknown>)[key],
      )
    ) {
      return false;
    }
  }

  return true;
}


// --- Deep Equality Check ---
// Basic deep equality check (replace with robust library if needed)
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  // After base cases, we know a and b are non-null objects

  // Handle Maps
  if (isMap(a) && isMap(b)) {
    return _deepEqualMaps(a, b);
  }

  // Handle Sets
  if (isSet(a) && isSet(b)) {
    return _deepEqualSets(a, b);
  }

  // Handle Arrays and Objects (assuming type check passed earlier)
  if (Array.isArray(a) === Array.isArray(b)) { // Ensure both are arrays or both are objects
      return _deepEqualArraysOrObjects(a, b);
  }

  // Should not be reached if initial type checks are correct, but return false as fallback
  return false;
}
// --- End Deep Equality Check ---
