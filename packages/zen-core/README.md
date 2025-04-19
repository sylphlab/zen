# @sylph/core

Core package for the zen state management library. Tiny, fast, and functional reactive state management.

Inspired by Nanostores, aiming for an even smaller footprint and high performance.

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
import { atom, computed, subscribe, get, set } from '@sylph/core';

// Create a writable atom state
const count = atom(0);

// Create a computed state derived from other atoms
const double = computed(count, (value) => value * 2);

// Subscribe to changes
const unsubscribe = subscribe(double, (value) => {
  console.log('Double count is now:', value);
});

// Read current value
console.log('Initial count:', get(count)); // Logs: Initial count: 0
console.log('Initial double:', get(double)); // Logs: Initial double: 0

// Update the base atom using the functional API
set(count, 1); // Logs: Double count is now: 2
set(count, 5); // Logs: Double count is now: 10

// Unsubscribe when no longer needed
unsubscribe();
```

## More Examples

### `map` Example

```typescript
import { map, setKey, listenKeys, get } from '@sylph/core';

const user = map({ name: 'Anon', age: 99 });

const unsubscribeKey = listenKeys(user, ['name'], (value) => {
  // Note: listener receives the full map value
  console.log('User name changed:', value.name);
});

console.log('Initial name:', get(user).name); // Logs: Initial name: Anon

setKey(user, 'name', 'Sylph'); // Logs: User name changed: Sylph
console.log('Updated name:', get(user).name); // Logs: Updated name: Sylph

unsubscribeKey();
```

### `deepMap` Example

```typescript
import { deepMap, setPath, listenPaths, get } from '@sylph/core';

const settings = deepMap({ user: { theme: 'dark', notifications: true }, other: [1, 2] });

const unsubPath = listenPaths(settings, [['user', 'theme']], (value) => {
    // Note: listener receives the full deepMap value
    console.log('Theme changed:', value.user.theme);
});

console.log('Initial theme:', get(settings).user.theme); // Logs: Initial theme: dark

// Update a nested property
setPath(settings, ['user', 'theme'], 'light'); // Logs: Theme changed: light
setPath(settings, ['other', 0], 100); // Update array element

console.log('Updated theme:', get(settings).user.theme); // Logs: Updated theme: light
console.log('Updated array:', get(settings).other); // Logs: Updated array: [100, 2]

unsubPath();
```

### `task` Example

```typescript
import { task, subscribe } from '@sylph/core';

const fetchData = task(async (id: number) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 50));
  if (id < 0) throw new Error('Invalid ID');
  return { data: `User data for ${id}` };
});

const unsubscribeTask = subscribe(fetchData, (state) => {
  if (state.loading) console.log('Task loading...');
  if (state.error) console.error('Task error:', state.error.message);
  if (state.data) console.log('Task success:', state.data);
});

fetchData.run(123); // Logs: Task loading... -> Task success: { data: 'User data for 123' }
// fetchData.run(-1); // Would log: Task loading... -> Task error: Invalid ID

// unsubscribeTask(); // Usually called on component unmount
```

### `batch` Example

```typescript
import { atom, computed, batch, subscribe, set } from '@sylph/core';

const firstName = atom('John');
const lastName = atom('Doe');
const fullName = computed([firstName, lastName], (f, l) => `${f} ${l}`);

const unsubscribeBatch = subscribe(fullName, (value) => {
  // This listener will only run ONCE after the batch
  console.log('Full name updated:', value);
});

batch(() => {
  set(firstName, 'Jane');
  set(lastName, 'Smith');
  // fullName listener is not triggered here yet
}); // Logs: Full name updated: Jane Smith

unsubscribeBatch();
```

### Lifecycle Example (`onMount`/`onStop`)

```typescript
import { atom, onMount, onStop, subscribe, get, set } from '@sylph/core';

const timerAtom = atom(0);

let intervalId: ReturnType<typeof setInterval> | undefined;

onMount(timerAtom, () => {
  console.log('Timer atom mounted (first subscriber added)');
  intervalId = setInterval(() => {
    set(timerAtom, get(timerAtom) + 1); // Use functional set/get
  }, 1000);

  // Return a cleanup function for onStop
  return () => {
    console.log('Timer atom stopped (last subscriber removed)');
    if (intervalId) clearInterval(intervalId);
    intervalId = undefined;
  };
});

console.log('Subscribing...');
const unsubTimer = subscribe(timerAtom, (value) => {
  console.log('Timer:', value);
});
// Logs: Subscribing... -> Timer atom mounted... -> Timer: 0 -> Timer: 1 ...

// setTimeout(() => {
//   console.log('Unsubscribing...');
//   unsubTimer(); // Logs: Unsubscribing... -> Timer atom stopped...
// }, 3500);
```


## Features

*   **Tiny size:** ~1.33 kB gzipped (full bundle).
*   Excellent performance (see benchmarks).
*   Functional API (`atom`, `computed`, `map`, `deepMap`, `task`, `batch`).
*   Lifecycle events (`onMount`, `onSet`, `onNotify`, `onStop`).
*   Key/Path listeners for maps (`listenKeys`, `listenPaths`).
*   Explicit batching for combining updates.

## API Documentation

Detailed API documentation can be found [here](../../../docs/modules/_sylph_core.html). (Link assumes TypeDoc output in `/docs` at repo root).

## License

MIT