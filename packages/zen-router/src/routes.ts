import type { RouteConfig } from './matcher';

/** Internal store for route configurations */
let internalRoutes: RouteConfig[] = [];

/**
 * Defines the application's routes. This replaces any previously defined routes.
 * @param newRoutes An array of route configuration objects.
 */
export function defineRoutes(newRoutes: RouteConfig[]): void {
  internalRoutes = newRoutes || [];
  // TODO: Maybe trigger a re-match of the current route if routes are redefined?
}

/**
 * Gets the currently defined routes. (Internal use)
 * @returns The array of route configurations.
 */
export function getRoutes(): RouteConfig[] {
  return internalRoutes;
}
