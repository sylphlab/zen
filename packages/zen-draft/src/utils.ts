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
