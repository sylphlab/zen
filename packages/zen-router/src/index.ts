// Entry point for @zen/router

// TODO: Implement router logic inspired by @nanostores/router
// Goals: Tiny size, high performance, zen/FP principles

import type { Unsubscribe } from '@zen/core';

/** Router interface with generic state type */
export type Router<S> = {
  /** Gets the current state */
  get(): S | null;
  /** Sets a new state value */
  set(value: S): void;
  /** Subscribes to state changes */
  subscribe(listener: (value: S | null, oldValue?: S | null) => void): Unsubscribe;
};

/** Creates a new router store with initial null state */
export function createRouter<S = unknown>(): Router<S> {
  let value: S | null = null;
  const listeners = new Set<(value: S | null, oldValue?: S | null) => void>();
  return {
    get() { return value; },
    set(newValue: S) {
      const old = value;
      value = newValue;
      listeners.forEach(fn => { try { fn(value, old); } catch { /* ignore errors */ } });
    },
    subscribe(listener) {
      listeners.add(listener);
      try { listener(value, undefined); } catch { /* ignore errors */ }
      return () => { listeners.delete(listener); };
    }
  };
}

/** Route type placeholder (extend as needed) */
export type Route = string;
/** Params type placeholder (mapping of route params) */
export type Params<P extends Record<string, string> = Record<string, string>> = P;
/** Search type placeholder (mapping of query params) */
export type Search<S extends Record<string, string> = Record<string, string>> = S;

export function getPagePath() { console.warn('getPagePath not implemented'); return ''; }
export function openPage() { console.warn('openPage not implemented'); }
export function redirectPage() { console.warn('redirectPage not implemented'); }

console.log('[@zen/router] Placeholder loaded');