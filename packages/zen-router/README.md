# @sylph/router

Tiny URL router integration for `@sylph/core` state management.

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
import { createRouter } from '@sylph/router';
import { subscribe } from '@sylph/core'; // Assuming core is needed for subscribe

// Define routes (path: data associated with the route)
const routes = {
  '/': { page: 'home' },
  '/about': { page: 'about' },
  '/users/:id': { page: 'userProfile' }, // Dynamic segment
};

// Create the router atom (defaults to window.location if available)
const router = createRouter(routes);

// Subscribe to route changes
const unsubscribeRouter = subscribe(router, (route) => {
  if (route) {
    console.log('Current route:', route.path);
    console.log('Route params:', route.params); // e.g., { id: '123' } for /users/123
    console.log('Route data:', route.data);   // e.g., { page: 'userProfile' }
  } else {
    console.log('No matching route found (404)');
  }
});

// To navigate (in a browser environment):
// window.history.pushState({}, '', '/users/456');

// To clean up:
// unsubscribeRouter();
```

## Features

*   Integrates with `@sylph/core` atoms.
*   Minimal API surface.
*   Tiny size.

(More documentation to come)