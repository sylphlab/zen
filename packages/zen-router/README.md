# @sylph/router

Tiny URL router integration for `@sylph/core` state management. Uses browser History API.

## Installation

```bash
npm install @sylph/router @sylph/core
# or
yarn add @sylph/router @sylph/core
# or
pnpm add @sylph/router @sylph/core
# or
bun add @sylph/router @sylph/core
```

## Basic Usage

```typescript
import { $router, defineRoutes, startHistoryListener, open, matchRoutes, RouteConfig } from '@sylph/router';
import { subscribe, get } from '@sylph/core';

// 1. Define your routes
// RouteConfig allows arbitrary data associated with a path
interface MyRouteConfig extends RouteConfig {
  componentName: string;
  title: string;
}

const routes: MyRouteConfig[] = [
  { path: '/', componentName: 'Home', title: 'Homepage' },
  { path: '/about', componentName: 'About', title: 'About Us' },
  { path: '/users/:id', componentName: 'UserProfile', title: 'User Profile' }, // Dynamic segment
  { path: '*', componentName: 'NotFound', title: 'Not Found' }, // Catch-all
];
defineRoutes(routes);

// 2. Subscribe to the router state atom ($router)
const unsubscribeRouter = subscribe($router, (routerState) => {
  console.log('Path:', routerState.path);
  console.log('Params:', routerState.params); // e.g., { id: '123' } for /users/123
  console.log('Search:', routerState.search); // e.g., { q: 'test' } for /?q=test

  // You often need to match the current path again to get associated route data
  const currentMatch = matchRoutes(routerState.path, routes);
  if (currentMatch) {
    console.log('Current Component:', (currentMatch.route as MyRouteConfig).componentName);
    document.title = (currentMatch.route as MyRouteConfig).title;
  } else {
     console.log('No matching route component found (404)');
     document.title = 'Not Found';
  }
});

// 3. Start listening to history changes (popstate, link clicks)
// Needs to run in a browser environment
startHistoryListener();

// 4. Navigate programmatically
// open('/about'); // Navigates to /about using pushState
// redirect('/users/456?ref=test'); // Navigates using replaceState

// Initial state based on current URL (e.g., if loaded at /users/10)
const initialState = get($router);
console.log('Initial State:', initialState);

// To clean up:
// unsubscribeRouter();
// stopHistoryListener(); // If needed
```

## Features

*   Integrates seamlessly with `@sylph/core` map atoms.
*   Minimal API surface (`$router`, `defineRoutes`, `matchRoutes`, `open`, `redirect`, `startHistoryListener`, `stopHistoryListener`).
*   Tiny size.
*   Supports dynamic segments (`:param`) and optional segments (`:param?`).
*   Basic catch-all routes (`*`).
*   Automatic parsing of query parameters (`search` state).
*   Intercepts clicks on local `<a>` tags for SPA navigation.
*   Uses browser History API (`pushState`, `replaceState`, `popstate`).

## API Documentation

Detailed API documentation can be found [here](../../../docs/modules/_sylph_router.html). (Link assumes TypeDoc output in `/docs` at repo root).

## License

MIT