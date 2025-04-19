import type { Params } from './index';

/** Configuration for a single route */
export interface RouteConfig {
  path: string; // e.g., /users/:id
  // Potentially add fields like component, loader function, etc. later
  [key: string]: any; // Allow arbitrary extra properties
}

/** Result of a successful route match */
export interface RouteMatch {
  route: RouteConfig;
  params: Params;
}

/**
 * Converts a path pattern string into a regular expression and extracts parameter keys.
 * Inspired by path-to-regexp, but simplified for core needs.
 * Handles basic parameters like :id and optional parameters like :id?.
 * Does not handle complex patterns like optional groups, wildcards (*), or custom regex within segments yet.
 * @known_limitation Does not reliably handle static segments immediately following a parameter (e.g., /:id.json).
 *
 * @param pathPattern The path pattern string (e.g., /users/:id).
 * @returns An object containing the RegExp and an array of parameter keys.
 */
export function pathToRegexp(pathPattern: string): { regexp: RegExp; keys: string[] } {
  // Handle catch-all route specifically
  if (pathPattern === '*') {
    return { regexp: new RegExp('^.*$'), keys: [] }; // Match anything
  }

  const keys: string[] = [];
  // Split path by slash, filter out empty segments resulting from multiple slashes e.g. //
  // Keep the first empty segment if the path starts with /
  // Ensure path starts with / unless it's '*'
  const processedPath = pathPattern === '*' || pathPattern.startsWith('/') ? pathPattern : '/' + pathPattern;

  // Removed duplicate keys declaration
  let pattern = '^';
  const segments = processedPath.split('/');

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Added check for undefined segment to satisfy TS
    if (segment === undefined) continue;

    // Skip the first empty segment from the leading '/'
    if (i === 0 && segment === '') {
      continue;
    }

    // Add the separator
    pattern += '\\/';

    if (segment.startsWith(':')) {
      const optional = segment.endsWith('?');
      const key = optional ? segment.slice(1, -1) : segment.slice(1);

      if (!key) {
        throw new Error(`Invalid parameter name in path "${pathPattern}"`);
      }
      keys.push(key);

      // Use non-greedy capture
      const captureGroup = '([^\\/]+?)';

      if (optional) {
        // Make the slash and the capture group optional together
        // Use a non-capturing group (?:...) for the optional part
        pattern = pattern.slice(0, -2); // Remove the preceding '\\/'
        pattern += '(?:\\/' + captureGroup + ')?';
      } else {
        pattern += captureGroup;
      }
    } else {
      // Literal segment: escape special characters
      // Escape characters with special meaning in regex.
      pattern += segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }

  // Handle the root path specifically ('/' results in segments ['', ''])
  // If pattern is still '^', it means the path was likely '/' or empty after split
  if (pattern === '^') {
    pattern += '\\/'; // Match only '/' for root
  }

  // Allow optional trailing slash ONLY if the original path didn't end with one
  // OR if it's the root path.
  if (!processedPath.endsWith('/') || processedPath === '/') {
      pattern += '\\/?';
  }

  pattern += '$'; // Match end of string

  const regexp = new RegExp(pattern, 'i'); // Case-insensitive matching

  return { regexp, keys };
}

/**
 * Matches a given path against a list of route configurations.
 *
 * @param currentPath The path string to match (e.g., /users/123).
 * @param routes An array of RouteConfig objects to match against.
 * @returns A RouteMatch object if a match is found, otherwise null.
 */
export function matchRoutes(currentPath: string, routes: RouteConfig[]): RouteMatch | null {
  for (const route of routes) {
    const { regexp, keys } = pathToRegexp(route.path);
    const match = regexp.exec(currentPath);

    if (match) {
      const params: Params = {};
      // Start from index 1 to skip the full match string
      for (let i = 1; i < match.length; i++) {
        const key = keys[i - 1];
        const value = match[i];
        // Decode matched values and handle undefined for optional params
        if (key && value !== undefined) {
          try {
            params[key] = decodeURIComponent(value);
          } catch (e) {
            console.error(`[zen-router] Failed to decode param "${key}" with value "${value}"`, e);
            params[key] = value; // Use raw value on decode error
          }
        } else if (key && value === undefined) {
          // Handle optional param not present in URL
          params[key] = undefined; // Or potentially skip adding it? Assigning undefined for now.
        }
      }
      return { route, params };
    }
  }
  return null; // No match found
}