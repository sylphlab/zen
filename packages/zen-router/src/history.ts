import { $router } from './index'; // Removed unused RouterState
import { get, setKey } from '@sylph/core'; // Import get and setKey
import { parseQuery } from './utils';
import { matchRoutes } from './matcher'; // Import matcher, removed unused RouteConfig
import { getRoutes } from './routes'; // Import route getter
// Note: getPathFromUrl is not needed here as location.pathname/search/hash are direct properties.

/**
 * Reads the current window.location, matches routes defined in routes.ts, and updates the $router store.
 * Assumes browser environment.
 */
function updateStateFromLocation(): void {
  if (typeof window === 'undefined') {
    console.warn('[zen-router] Attempted to update state from location outside browser environment.');
    return;
  }

  const currentPath = window.location.pathname;
  const currentSearch = parseQuery(window.location.search);
  // Match the current path against defined routes
  const match = matchRoutes(currentPath, getRoutes()); // Use getRoutes()
  const currentParams = match ? match.params : {};

  // Update the store - use setKey for potential performance benefits if only parts change
  // Although for initial load or full navigation, a single `set` might be okay too.
  // Let's use setKey for now.
  const currentState = get($router); // Use get($router)
  if (currentState.path !== currentPath) {
    setKey($router, 'path', currentPath); // Use setKey($router, ...)
  }
  // Simple comparison; deep comparison might be needed for objects later
  if (JSON.stringify(currentState.search) !== JSON.stringify(currentSearch)) {
     setKey($router, 'search', currentSearch); // Use setKey($router, ...)
  }
  if (JSON.stringify(currentState.params) !== JSON.stringify(currentParams)) {
     setKey($router, 'params', currentParams); // Use setKey($router, ...)
  }
}

// Function to handle link clicks
export function handleLinkClick(event: MouseEvent): void { // Export for testing
  // Check for modified clicks (ctrl, meta, etc.) or non-primary button clicks
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.button !== 0) {
    return;
  }

  // Find the closest anchor tag using event.composedPath() for shadow DOM compatibility, falling back to target/parentElement
  const path = event.composedPath && event.composedPath();
  let link: HTMLAnchorElement | null = null;
  if (path) {
      for (const element of path) {
          if (element instanceof HTMLElement && element.nodeName === 'A') {
              link = element as HTMLAnchorElement;
              break;
          }
      }
  } else {
      // Fallback for browsers not supporting composedPath
      let currentTarget = event.target as Element | null;
      while (currentTarget && currentTarget.nodeName !== 'A') {
          currentTarget = currentTarget.parentElement;
      }
      if (currentTarget instanceof HTMLAnchorElement) {
          link = currentTarget;
      }
  }


  // Ensure it's a valid anchor tag and has an href
  if (link && link.href) {
    // Check target, download, and rel attributes
    if (link.target || link.hasAttribute('download') || link.getAttribute('rel') === 'external') {
      return;
    }

    // Check if it's the same origin
    // Use link.origin which is simpler and more reliable than constructing URL
    if (link.origin !== window.location.origin) {
      return;
    }

    // Prevent default navigation and use router's open function
    event.preventDefault();
    // Construct path from pathname, search, and hash
    const path = link.pathname + link.search + link.hash;
    open(path);
  }
}


// --- Initialization ---

/**
 * Initializes the router history listeners (popstate, click) and sets initial state.
 * Should be called once in a browser environment.
 */
export function startHistoryListener(): void {
  if (typeof window !== 'undefined') {
    // Ensure initial state is set based on current URL
    updateStateFromLocation();
    // Listen for browser back/forward navigation
    window.addEventListener('popstate', updateStateFromLocation);
    // Listen for clicks globally to intercept navigation
    // Ensure body exists before adding listener
    if (document.body) {
        document.body.addEventListener('click', handleLinkClick);
    } else {
        // Fallback or warning if body isn't available immediately
        console.warn('[zen-router] document.body not found immediately during startHistoryListener. Click listener might not be attached.');
        // Optionally, retry with DOMContentLoaded or similar if needed in real app
    }
    // console.log('[zen-router] History listeners started.'); // Optional debug log
  } else {
    console.warn('[zen-router] startHistoryListener called outside browser environment.');
  }
}

/**
 * Removes the router history listeners.
 */
export function stopHistoryListener(): void {
  if (typeof window !== 'undefined') {
    window.removeEventListener('popstate', updateStateFromLocation);
    // Ensure body exists before trying to remove listener
    if (document.body) {
       document.body.removeEventListener('click', handleLinkClick);
    }
    // console.log('[zen-router] History listeners stopped.'); // Optional debug log
  }
  // No warning needed if called outside browser, it's a no-op
}

// --- Navigation Functions ---

/**
 * Navigates to a new path using history.pushState.
 * @param path The new path to navigate to (e.g., '/users/1').
 */
export function open(path: string): void {
  if (typeof window !== 'undefined') {
    history.pushState(null, '', path);
    updateStateFromLocation();
  } else {
    console.warn('[zen-router] open() called outside browser environment.');
  }
}

/**
 * Navigates to a new path using history.replaceState.
 * @param path The new path to navigate to (e.g., '/users/1').
 */
export function redirect(path: string): void {
  if (typeof window !== 'undefined') {
    history.replaceState(null, '', path);
    updateStateFromLocation();
  } else {
    console.warn('[zen-router] redirect() called outside browser environment.');
  }
}

// Note: updateStateFromLocation is internal and not exported.