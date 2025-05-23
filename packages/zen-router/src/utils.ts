import type { Search } from './index';

/**
 * Parses a query string (e.g., '?a=1&b=2') into an object.
 * @param queryString The query string (including the leading '?').
 * @returns An object representing the query parameters.
 */
export function parseQuery(queryString: string): Search {
  let processedQueryString = queryString;
  if (processedQueryString.startsWith('?')) {
    processedQueryString = processedQueryString.slice(1);
  }
  const search: Search = {};
  if (!processedQueryString) {
    return search;
  }
  for (const pair of processedQueryString.split('&')) {
    const parts = pair.split('=');
    const keySource = parts[0];
    const valueSource = parts[1];

    // Ensure key exists before decoding
    if (typeof keySource !== 'string') continue;
    const key = decodeURIComponent(keySource);
    if (!key) continue; // Skip if key is empty after decoding

    // Handle cases like '?flag' where there's no value, and ensure valueSource exists before replace
    const value =
      typeof valueSource === 'string' ? decodeURIComponent(valueSource.replace(/\+/g, ' ')) : '';

    // Simple assignment, doesn't handle multiple values for the same key yet
    search[key] = value;
  }
  return search;
}

/**
 * Extracts the path (including search and hash) from a full URL or returns the input if it's already a path.
 * @param urlOrPath A full URL (http://...) or a path (/...).
 * @returns The path part (e.g., /page?query#hash).
 */
export function getPathFromUrl(urlOrPath: string): string {
  try {
    // If it's a full URL, extract path, search, and hash
    const url = new URL(urlOrPath);
    return url.pathname + url.search + url.hash;
  } catch (_e) {
    // If it's not a valid URL, assume it's already a path
    // Basic check to ensure it starts with '/' or is empty
    if (urlOrPath.startsWith('/') || urlOrPath === '') {
      return urlOrPath;
    }
    return urlOrPath;
  }
}
