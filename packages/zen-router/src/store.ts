import type { Unsubscribe } from '@sylph/core'; // Adjusted import path

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