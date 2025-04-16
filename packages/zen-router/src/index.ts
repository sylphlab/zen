// Entry point for @zen/router

// TODO: Implement router logic inspired by @nanostores/router
// Goals: Tiny size, high performance, zen/FP principles

export function createRouter(/* routes, options */) {
  console.warn('@zen/router not implemented yet');
  // Placeholder implementation
  const store = {
      value: null,
      get() { return this.value },
      set(newValue: any) { this.value = newValue; /* notify? */ },
      subscribe(listener: any) { /* add listener */ return () => { /* remove listener */ } }
  };
  return store;
}

// Placeholder exports
export type Router = any;
export type Route = any;
export type Params = any;
export type Search = any;

export function getPagePath() { console.warn('getPagePath not implemented'); return ''; }
export function openPage() { console.warn('openPage not implemented'); }
export function redirectPage() { console.warn('redirectPage not implemented'); }

console.log('[@zen/router] Placeholder loaded');