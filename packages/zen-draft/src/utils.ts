/**
 * Checks if a value is considered "draftable" (can be proxied).
 * For now, this includes plain objects and arrays.
 * We might need to refine this later to exclude specific object types (like Date, RegExp, etc.)
 * or handle them differently. Excludes common built-ins like Date, RegExp, etc.
 */
export function isDraftable(value: unknown): boolean {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  // Check for common non-plain objects we don't want to draft
  if (
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof Promise ||
    value instanceof Map ||
    value instanceof Set
  ) {
    return false;
  }

  // Check if it's a plain object or an array
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === Array.prototype || proto === null;
}
export function isMap(value: unknown): value is Map<any, any> {
  return value instanceof Map;
}

export function isSet(value: unknown): value is Set<any> {
  return value instanceof Set;
}
