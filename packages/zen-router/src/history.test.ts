import { get, map, setKey } from '@sylphlab/zen-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleLinkClick,
  open,
  redirect,
  startHistoryListener,
  stopHistoryListener,
} from './history';
import { $router, type RouterState } from './index'; // Assuming index exports $router and type
import * as matcher from './matcher'; // To mock matchRoutes
import * as routes from './routes'; // To mock getRoutes
import * as utils from './utils'; // To mock parseQuery

import * as core from '@sylphlab/zen-core'; // Import actual core functions

// Define mockRouterStore *before* vi.mock uses it
const _mockRouterStore = core.map<RouterState>({ path: '', search: {}, params: {} }); // Keep for type reference if needed, but don't mock export

// No longer mocking './index' directly

// Mock matcher and routes
vi.mock('./matcher');
vi.mock('./routes');
vi.mock('./utils');

// Mock window/history/location/document/console
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
const mockPushState = vi.fn();
const mockReplaceState = vi.fn();
const mockPreventDefault = vi.fn();
const mockConsoleWarn = vi.fn();

// Store original globals
let originalWindow: any;
let originalHistory: any;
let originalLocation: any;
let originalDocument: any;
let originalConsole: any;

// Make beforeEach async
beforeEach(async () => {
  // Reset mocks
  vi.resetAllMocks();

  // Store originals if not already stored
  if (originalWindow === undefined) originalWindow = global.window;
  if (originalHistory === undefined) originalHistory = global.history;
  if (originalLocation === undefined) originalLocation = global.location;
  if (originalDocument === undefined) originalDocument = global.document;
  if (originalConsole === undefined) originalConsole = global.console;

  // Mock window and related properties
  global.window = {
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    history: {
      pushState: vi.fn((...args) => {
        // Mock pushState: update location and call original mock
        const path = args[2];
        if (typeof path === 'string') {
          const url = new URL(path, global.location.origin);
          global.location.pathname = url.pathname;
          global.location.search = url.search;
          global.location.hash = url.hash;
        }
        mockPushState(...args);
      }),
      replaceState: vi.fn((...args) => {
        // Mock replaceState: update location and call original mock
        const path = args[2];
        if (typeof path === 'string') {
          const url = new URL(path, global.location.origin);
          global.location.pathname = url.pathname;
          global.location.search = url.search;
          global.location.hash = url.hash;
        }
        mockReplaceState(...args);
      }),
    } as any,
    location: {
      pathname: '/',
      search: '',
      hash: '',
      origin: 'http://localhost',
    } as any,
    dispatchEvent: vi.fn((event: Event) => {
      if (event.type === 'popstate') {
        const popstateListener = mockAddEventListener.mock.calls.find(
          (call) => call[0] === 'popstate',
        )?.[1];
        popstateListener?.();
      }
      return true;
    }),
  } as any;

  global.history = global.window.history;
  global.location = global.window.location;

  // Restore document mock structure, but use jsdom's createElement
  global.document = {
    // Assign jsdom's createElement to the mock
    createElement: document.createElement.bind(document), // Use global document from jsdom
    body: {
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    },
    // Add other document properties if needed by tests
  } as any;

  // Mock console.warn
  global.console = { ...originalConsole, warn: mockConsoleWarn };

  // Default mock implementations
  vi.mocked(routes.getRoutes).mockReturnValue([]);
  vi.mocked(matcher.matchRoutes).mockReturnValue(null);
  vi.mocked(utils.parseQuery).mockReturnValue({});

  // Reset the state of the *real* $router store
  core.set($router, { path: '', search: {}, params: {} });

  // Spy on the actual setKey function if needed for assertions
  // vi.spyOn(core, 'setKey'); // Example: Add this if tests need to assert setKey calls
});

afterEach(() => {
  // Restore original globals
  global.window = originalWindow;
  global.history = originalHistory;
  global.location = originalLocation;
  global.document = originalDocument;
  global.console = originalConsole;
});

describe('History API', () => {
  describe('updateStateFromLocation (Internal)', () => {
    // Test effects via other functions

    // Test needs to be async because startHistoryListener calls async functions indirectly via mocks
    it('should update store based on mocked location and route match', async () => {
      global.location.pathname = '/users/123';
      global.location.search = '?q=test';
      const mockMatch = { route: { path: '/users/:id' }, params: { id: '123' } };
      const mockSearch = { q: 'test' };
      vi.mocked(routes.getRoutes).mockReturnValue([{ path: '/users/:id' }]);
      vi.mocked(matcher.matchRoutes).mockReturnValue(mockMatch);
      vi.mocked(utils.parseQuery).mockReturnValue(mockSearch);

      startHistoryListener(); // Calls updateStateFromLocation

      // Assert using the real $router store's state
      const finalState = core.get($router);
      expect(finalState.path).toBe('/users/123');
      expect(finalState.search).toEqual(mockSearch);
      expect(finalState.params).toEqual(mockMatch.params);
    });

    // Test needs to be async
    it('should not update store keys if values are unchanged', async () => {
      global.location.pathname = '/users/123';
      const mockMatch = { route: { path: '/users/:id' }, params: { id: '123' } };
      vi.mocked(routes.getRoutes).mockReturnValue([{ path: '/users/:id' }]);
      vi.mocked(matcher.matchRoutes).mockReturnValue(mockMatch);
      // Set initial state of the real $router store
      core.set($router, { path: '/users/123', search: {}, params: { id: '123' } });

      // Spy on setKey to check it wasn't called
      const setKeySpy = vi.spyOn(core, 'setKey');
      startHistoryListener();
      expect(setKeySpy).not.toHaveBeenCalled();
      setKeySpy.mockRestore(); // Clean up spy
    });

    // Test needs to be async
    it('should handle no route match', async () => {
      global.location.pathname = '/not-found';
      vi.mocked(matcher.matchRoutes).mockReturnValue(null);

      startHistoryListener();

      // Assert using the real $router store's state
      const finalState = core.get($router);
      expect(finalState.path).toBe('/not-found');
      expect(finalState.search).toEqual({});
      expect(finalState.params).toEqual({});
    });

    // Test non-browser warning via startHistoryListener
    it('should warn if trying to update state outside browser', () => {
      global.window = undefined as any; // Simulate non-browser
      startHistoryListener();
      // The first warning is from startHistoryListener itself
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('startHistoryListener called outside browser'),
      );
    });
  });

  describe('startHistoryListener / stopHistoryListener', () => {
    it('should add popstate and click listeners on start', () => {
      startHistoryListener();
      expect(mockAddEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('click', handleLinkClick);
      expect(vi.mocked(matcher.matchRoutes)).toHaveBeenCalled(); // Initial update call
    });

    it('should remove popstate and click listeners on stop', () => {
      startHistoryListener(); // Add them first
      stopHistoryListener();
      expect(mockRemoveEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('click', handleLinkClick);
    });

    it('should call updateStateFromLocation on popstate event', () => {
      startHistoryListener();
      vi.mocked(matcher.matchRoutes).mockClear(); // Clear initial call

      // Simulate popstate
      global.window.dispatchEvent(new PopStateEvent('popstate'));

      expect(vi.mocked(matcher.matchRoutes)).toHaveBeenCalledTimes(1); // Called again on popstate
    });

    it('should warn on start if body not present', () => {
      global.document.body = null as any; // Simulate body not ready
      startHistoryListener();
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('document.body not found'),
      );
      expect(mockAddEventListener).not.toHaveBeenCalledWith('click', expect.any(Function)); // Click listener not added
    });

    it('should warn on start if outside browser', () => {
      global.window = undefined as any;
      startHistoryListener();
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('startHistoryListener called outside browser'),
      );
      expect(mockAddEventListener).not.toHaveBeenCalled();
    });

    it('should not warn on stop if outside browser', () => {
      global.window = undefined as any;
      stopHistoryListener();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });

  describe('open', () => {
    it('should call history.pushState and update state', () => {
      startHistoryListener(); // Ensure listeners are active
      vi.mocked(matcher.matchRoutes).mockClear(); // Clear mock calls if needed

      open('/new-path');

      expect(mockPushState).toHaveBeenCalledWith(null, '', '/new-path');
      expect(vi.mocked(matcher.matchRoutes)).toHaveBeenCalledTimes(1); // update called
      // Assert state change on real $router
      expect(core.get($router).path).toBe('/new-path');
    });

    it('should warn if called outside browser', () => {
      global.window = undefined as any;
      open('/new-path');
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('open() called outside browser'),
      );
      expect(mockPushState).not.toHaveBeenCalled();
    });
  });

  describe('redirect', () => {
    it('should call history.replaceState and update state', () => {
      startHistoryListener(); // Ensure listeners are active
      vi.mocked(matcher.matchRoutes).mockClear(); // Clear mock calls if needed

      redirect('/another-path');

      expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/another-path');
      expect(vi.mocked(matcher.matchRoutes)).toHaveBeenCalledTimes(1); // update called
      // Assert state change on real $router
      expect(core.get($router).path).toBe('/another-path');
    });

    it('should warn if called outside browser', () => {
      global.window = undefined as any;
      redirect('/another-path');
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('redirect() called outside browser'),
      );
      expect(mockReplaceState).not.toHaveBeenCalled();
    });
  });

  describe('handleLinkClick', () => {
    const createMockEvent = (
      target: Element | null,
      options: Partial<MouseEvent> = {},
      composedPathFn?: () => Array<EventTarget>,
    ): MouseEvent => {
      const event = {
        target: target,
        button: 0,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        preventDefault: mockPreventDefault,
        composedPath: composedPathFn, // Use provided function or default
        ...options,
      } as MouseEvent;
      // Default composedPath if not provided
      if (!composedPathFn && target) {
        event.composedPath = () =>
          [target, document?.body, document, window].filter(Boolean) as Array<EventTarget>;
      }
      return event;
    };

    // Helper to create nested elements for fallback test
    const createNestedElements = (): {
      anchor: HTMLAnchorElement;
      span: HTMLSpanElement;
      div: HTMLDivElement;
    } => {
      // Use jsdom's document.createElement
      const anchor = document.createElement('a'); // No need to cast
      anchor.href = 'http://localhost/fallback';
      // Origin is handled by jsdom based on href
      anchor.pathname = '/fallback'; // Ensure pathname is set
      anchor.search = ''; // Ensure search is set
      anchor.hash = '';
      const span = global.document.createElement('span') as HTMLSpanElement;
      const div = global.document.createElement('div') as HTMLDivElement;
      anchor.appendChild(span);
      div.appendChild(anchor);
      // Mock parentElement structure
      Object.defineProperty(span, 'parentElement', { value: anchor, configurable: true });
      Object.defineProperty(anchor, 'parentElement', { value: div, configurable: true });
      return { anchor, span, div };
    };

    it('should call open for same-origin links without modifiers', () => {
      // Use jsdom's document.createElement
      const link = document.createElement('a');
      link.href = 'http://localhost/internal';
      // Origin is handled by jsdom
      link.pathname = '/internal'; // Ensure pathname is set
      link.search = ''; // Ensure search is set
      link.hash = ''; // Ensure hash is set
      const event = createMockEvent(link);
      handleLinkClick(event);
      expect(mockPreventDefault).toHaveBeenCalled();
      // Check that pushState mock (which updates location) was called
      expect(mockPushState).toHaveBeenCalledWith(null, '', '/internal');
      // Check that updateState was triggered after pushState (via open)
      expect(core.get($router).path).toBe('/internal');
    });

    // --- Tests for ignoring clicks (modifiers, target, download, rel, origin, non-anchor) remain the same ---
    it('should ignore clicks with modifier keys', () => {
      const link = document.createElement('a');
      link.href = 'http://localhost/internal';
      // Origin is handled by jsdom
      handleLinkClick(createMockEvent(link, { ctrlKey: true }));
      handleLinkClick(createMockEvent(link, { metaKey: true }));
      handleLinkClick(createMockEvent(link, { altKey: true }));
      handleLinkClick(createMockEvent(link, { shiftKey: true }));
      handleLinkClick(createMockEvent(link, { button: 1 })); // Non-primary button
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockPushState).not.toHaveBeenCalled();
    });

    it('should ignore clicks with target attribute', () => {
      const link = document.createElement('a');
      link.href = 'http://localhost/internal';
      // Origin is handled by jsdom
      link.target = '_blank';
      handleLinkClick(createMockEvent(link));
      expect(mockPreventDefault).not.toHaveBeenCalled();
    });

    it('should ignore clicks with download attribute', () => {
      const link = document.createElement('a');
      link.href = 'http://localhost/internal';
      // Origin is handled by jsdom
      link.setAttribute('download', ''); // Use mocked setAttribute
      // hasAttribute is mocked in createElement now
      handleLinkClick(createMockEvent(link));
      expect(mockPreventDefault).not.toHaveBeenCalled();
    });

    it('should ignore clicks with rel=external', () => {
      const link = document.createElement('a');
      link.href = 'http://localhost/internal';
      // Origin is handled by jsdom
      link.setAttribute('rel', 'external'); // Use mocked setAttribute
      // getAttribute is mocked in createElement now
      handleLinkClick(createMockEvent(link));
      expect(mockPreventDefault).not.toHaveBeenCalled();
    });

    it('should ignore clicks to different origins', () => {
      const link = document.createElement('a');
      link.href = 'http://external.com/page';
      // Origin is handled by jsdom
      handleLinkClick(createMockEvent(link));
      expect(mockPreventDefault).not.toHaveBeenCalled();
    });

    it('should ignore clicks on non-anchor elements', () => {
      const div = document.createElement('div');
      handleLinkClick(createMockEvent(div));
      expect(mockPreventDefault).not.toHaveBeenCalled();
    });
    // --- End of ignore tests ---

    it('should use parentElement fallback if composedPath is unavailable', () => {
      const { anchor, span } = createNestedElements();
      // Create event targeting the inner span, with composedPath undefined
      const event = createMockEvent(span, {}, () => undefined as any); // Force composedPath to be undefined

      handleLinkClick(event);

      expect(mockPreventDefault).toHaveBeenCalled();
      // Check that pushState mock (which updates location) was called
      expect(mockPushState).toHaveBeenCalledWith(null, '', '/fallback');
      // Check that updateState was triggered after pushState (via open)
      expect(core.get($router).path).toBe('/fallback');
    });

    it('should not call open via fallback if no parent anchor found', () => {
      const span = document.createElement('span');
      const div = document.createElement('div');
      div.appendChild(span);
      Object.defineProperty(span, 'parentElement', { value: div, configurable: true }); // Mock parent

      const event = createMockEvent(span, {}, () => undefined as any); // Force composedPath undefined

      handleLinkClick(event);

      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockPushState).not.toHaveBeenCalled();
    });
  });
});
