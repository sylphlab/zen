import { describe, it, expect } from 'vitest';
import { get } from '@sylphlab/zen-core';

// Import core exports
import {
  $router,
  defineRoutes,
  open,
  redirect,
  // Types are checked implicitly by usage/compilation
  // type Route,
  // type Params,
  // type Search,
  // type RouterState
} from '../index';

describe('@sylph/router core exports', () => {
  it('should export the core router store', () => {
    expect($router).toBeDefined();

    expect(typeof $router).toBe('object'); // It's a MapAtom, which is an object
    // Removed check for .get as it's a functional API: get($router)
  });

  it('should initialize with default empty state', () => {
    const initialState = get($router); // Use the imported get function
    expect(initialState).toEqual({
      path: '',
      params: {},
      search: {},
    });
  });

  it('should export core router functions', () => {
    expect(defineRoutes).toBeDefined();
    expect(typeof defineRoutes).toBe('function');

    expect(open).toBeDefined();
    expect(typeof open).toBe('function');

    expect(redirect).toBeDefined();
    expect(typeof redirect).toBe('function');
  });

  // TODO: Add more detailed tests for each function's behavior
});
