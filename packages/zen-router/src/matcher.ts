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
  const segments = pathPattern.split('/').filter((s, i, arr) => s !== '' || i === 0 || i === arr.length -1);
  let pattern = '^';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Handle root path case where split results in ['', ''] for '/'
    if (segment === '' && i === 0 && segments.length === 2 && segments[1] === '') {
        pattern += '\\/'; // Match '/'
        break; // Path is just '/'
    }


    // Skip leading empty string if path starts with '/'
    if (segment === '' && i === 0) {
      pattern += '\\/'; // Start with a mandatory slash
      continue;
    }
     // Skip trailing empty string if path ends with '/'
    if (segment === '' && i === segments.length - 1) {
        continue;
    }


    // Add the separator before the segment (unless it's the first proper segment after root)
    if (i > 1 || (i === 1 && segments[0] !== '')) {
         pattern += '\\/';
    }


    // Ensure segment is a string before processing
    if (typeof segment === 'string') {
        if (segment.startsWith(':')) {
          const optional = segment.endsWith('?');
          const key = optional ? segment.slice(1, -1) : segment.slice(1);
      if (!key) {
          // Handle invalid pattern like /: or /:?
          throw new Error(`Invalid parameter name in path "${pathPattern}"`);
      }
      keys.push(key);
      // Parameter segment: match one or more non-slash characters
      const captureGroup = '([^\\/]+?)';
      if (optional) {
         // Optional parameter: make the parameter capture group optional
         // The preceding slash logic is handled above
         pattern += captureGroup + '?';
      } else {
         // Required parameter
         pattern += captureGroup;
      }
    } else {
      // Literal segment: escape special characters
          pattern += segment.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1'); // Use single backslash for replacement
        }
    } // End of typeof segment === 'string' check
  }

   // Ensure the pattern matches the whole path string, allowing optional trailing slash
   // If the pattern is just '^/' (from root path '/'), make the slash optional at the end
   if (pattern === '^\\/') {
       pattern += '?$';
   } else {
       // Add optional trailing slash only if the path didn't explicitly end with one
       if (!pathPattern.endsWith('/') || pathPattern === '/') {
           pattern += '\\/?';
       }
       pattern += '$';
   }


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