# @sylph/core

Core package for the zen state management library. Tiny, fast, and functional reactive state management.

## Installation

```bash
npm install @sylph/core
# or
yarn add @sylph/core
# or
pnpm add @sylph/core
# or
bun add @sylph/core
```

## Basic Usage

```typescript
import { atom, computed, subscribe } from '@sylph/core';

// Create a writable atom state
const count = atom(0);

// Create a computed state derived from other atoms
const double = computed(count, (value) => value * 2);

// Subscribe to changes
const unsubscribe = subscribe(double, (value) => {
  console.log('Double count is now:', value);
});

// Update the base atom
count.set(1); // Logs: Double count is now: 2
count.set(5); // Logs: Double count is now: 10

// Unsubscribe when no longer needed
unsubscribe();
```

## Features

*   Tiny size (~3kB gzipped)
*   Excellent performance
*   Functional API (`atom`, `computed`, `map`, `deepMap`, `task`, `batch`)
*   Lifecycle events (`onMount`, `onSet`, `onNotify`, `onStop`)
*   Explicit batching

(More documentation to come)