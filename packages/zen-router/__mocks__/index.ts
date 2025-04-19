import { vi } from 'vitest';
import type { Unsubscribe } from '@sylphlab/zen-core'; // Import from core
import type { RouterState } from '../src/index'; // Import real types from actual source

// State and listeners for the mock
let mockRouterState: RouterState = { path: '/', search: {}, params: {} };
const mockListeners = new Set<(state: RouterState) => void>();
const mockUnsubscribeFn = vi.fn();

// The mock router object
export const $router = {
    get: vi.fn(() => mockRouterState),
    set: (newState: RouterState) => { // Add set for test control
        mockRouterState = newState;
        mockListeners.forEach(listener => listener(newState));
    },
    subscribe: vi.fn((listener: (state: RouterState) => void): Unsubscribe => {
        mockListeners.add(listener);
        // Don't call immediately - let hook handle initial state via get
        return mockUnsubscribeFn;
    }),
    // Add mock implementations for other exports if needed by tests
    defineRoutes: vi.fn(),
    matchRoutes: vi.fn(),
    open: vi.fn(),
    redirect: vi.fn(),
    startHistoryListener: vi.fn(),
    stopHistoryListener: vi.fn(),

    // Helper for tests to reset state and listeners
    __resetMock: () => {
        mockRouterState = { path: '/', search: {}, params: {} };
        mockListeners.clear();
        vi.resetAllMocks(); // Reset calls on all vi.fn within this mock
        // Re-apply default implementations after reset
        $router.get.mockImplementation(() => mockRouterState);
        $router.subscribe.mockImplementation((listener) => {
             mockListeners.add(listener);
             // Don't call immediately
             return mockUnsubscribeFn;
        });
    }
};

// Re-export types needed by tests (only RouterState from this module's perspective)
export type { RouterState };
// Other types like Params, Search, RouteConfig, RouteMatch should be imported directly
// from their source modules ('../src/index', '../src/matcher') in the test file if needed.