import { set } from '@sylphlab/zen-core'; // Import the functional set
import { beforeEach, describe, expect, it } from 'vitest';
import { $router } from '../index';
import { matchRoutes } from '../matcher'; // Assuming matchRoutes is exported or made available for testing
import { defineRoutes, getRoutes } from '../routes'; // Assuming getRoutes is exported or made available for testing

// Mock routes for testing
const testRoutes = [
  { path: '/', component: 'Home' },
  { path: '/about', component: 'About' },
  { path: '/users/:userId', component: 'User' },
  { path: '/users/:userId/posts/:postId', component: 'Post' },
  { path: '*', component: 'NotFound' }, // Catch-all
];

describe('Router - Routing Logic', () => {
  beforeEach(() => {
    // Reset routes before each test if defineRoutes modifies global state
    // Or ensure defineRoutes returns a fresh set
    defineRoutes(testRoutes);
    // Reset router store if needed
    set($router, { path: '', params: {}, search: {} }); // Use functional set
  });

  it('should define and retrieve routes', () => {
    // This test assumes getRoutes exists and works
    const defined = getRoutes();
    expect(defined).toEqual(testRoutes);
    // Add more specific checks if defineRoutes transforms the input
  });

  it('should match a simple static route', () => {
    const match = matchRoutes('/about', getRoutes());
    expect(match).toBeDefined();
    expect(match?.route.component).toBe('About');
    expect(match?.params).toEqual({});
  });

  it('should match a route with one parameter', () => {
    const match = matchRoutes('/users/123', getRoutes());
    expect(match).toBeDefined();
    expect(match?.route.component).toBe('User');
    expect(match?.params).toEqual({ userId: '123' });
  });

  it('should match a route with multiple parameters', () => {
    const match = matchRoutes('/users/abc/posts/xyz', getRoutes());
    expect(match).toBeDefined();
    expect(match?.route.component).toBe('Post');
    expect(match?.params).toEqual({ userId: 'abc', postId: 'xyz' });
  });

  it('should match the catch-all route for unknown paths', () => {
    const match = matchRoutes('/non/existent/path', getRoutes());
    expect(match).toBeDefined();
    expect(match?.route.component).toBe('NotFound');
    expect(match?.params).toEqual({});
  });

  it('should return undefined if no routes are defined', () => {
    defineRoutes([]); // Define empty routes
    const match = matchRoutes('/about', getRoutes());
    expect(match).toBeNull(); // Should return null for no match
  });

  it('should return undefined if path does not match any route (no catch-all)', () => {
    const routesWithoutCatchAll = testRoutes.filter((r) => r.path !== '*');
    defineRoutes(routesWithoutCatchAll);
    const match = matchRoutes('/non/existent/path', getRoutes());
    expect(match).toBeNull(); // Should return null for no match
  });

  // TODO: Add tests for query parameters (search)
  // TODO: Add tests for edge cases (trailing slashes, encoding, etc.)
  // TODO: Test defineRoutes behavior (e.g., overwriting, errors)
});
