// Entry point for @zen/router

// TODO: Implement router logic inspired by @nanostores/router
// Goals: Tiny size, high performance, zen/FP principles

import { type MapZen, map } from '@sylphlab/zen-core';

/** Route type placeholder (extend as needed) */
export type Route = string;
/** Params type placeholder (mapping of route params) */
export type Params<
  P extends Record<string, string | undefined> = Record<string, string | undefined>,
> = P;
/** Search type placeholder (mapping of query params) */
export type Search<
  S extends Record<string, string | undefined> = Record<string, string | undefined>,
> = S;

/** Represents the state of the router */
export interface RouterState {
  path: string;
  params: Params;
  search: Search;
}

// --- Public API ---

// Store
export const $router: MapZen<RouterState> = map({
  path: '',
  params: {},
  search: {},
});
// Functions
export { defineRoutes } from './routes';
export { open, redirect } from './history';

// Types (already exported above)
// Types are exported via their declarations above
