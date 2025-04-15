-[pyt]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         \nm;.l////////////////p;looooooooooooooooooo\=]\0999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999?""""""""""""
 zen Library

[![size](https://img.shields.io/bundlephobia/minzip/zen)](https://bundlephobia.com/package/zen)

> **Work In Progress - API subject to change**

An **ultra-minimal** and fast state management library inspired by [Nanostores](https://github.com/nanostores/nanostores).

**Core Goal:** Achieve excellent performance with a very small bundle size. (Note: Size target of < 265 B was sacrificed for better performance).

## Installation

```bash
npm install zen # Or your preferred package manager (package not yet published)
```

## Core API

### `atom(initialValue)`

Creates a simple state container.

```typescript
import { atom } from 'zen';

const counter = atom(0);

// Read value
console.log(counter.get()); // Output: 0

// Listen to changes
const unsubscribe = counter.subscribe(value => {
  console.log('Counter changed:', value);
});

// Update value
counter.set(1); // Output: Counter changed: 1
counter.set(2); // Output: Counter changed: 2

// Stop listening
unsubscribe();

// Silent update (won't trigger listeners if value is the same)
counter.set(2);
```

### `computed(dependencies, calculation)`

Creates a derived state atom based on one or more source atoms.

```typescript
import { atom, computed } from 'zen';

const count = atom(1);
const isEven = computed([count], value => value % 2 === 0);
const message = computed([count, isEven], (countVal, evenVal) =>
  `Count is ${countVal}. It is ${evenVal ? 'even' : 'odd'}.`
);

const unsub = message.subscribe(msg => {
  console.log(msg);
});
// Get initial value (computed is lazy, need to call get or subscribe)
console.log('Initial message:', message.get());
// Output: Initial message: Count is 1. It is odd.
// Output: Count is 1. It is odd. (from subscribe initial call)

count.set(2);
// Output: Count is 2. It is even. (from subscribe)

count.set(3);
// Output: Count is 3. It is odd. (from subscribe)

unsub();
```

### `map(initialObject)`

Optimized for object state where individual keys often change. Provides `setKey`.

```typescript
import { map } from 'zen';

const profile = map({ name: 'John', age: 30 });

profile.subscribe(state => {
  console.log('Profile updated:', state);
});
// Output: Profile updated: { name: 'John', age: 30 } (initial call)

profile.setKey('age', 31);
// Output: Profile updated: { name: 'John', age: 31 }

profile.set({ name: 'Jane', age: 25 }); // Can also set the whole object
// Output: Profile updated: { name: 'Jane', age: 25 }
```

### `deepMap(initialObject)`

Similar to `map`, but optimized for deeply nested objects. `setKey` accepts string paths (`'a.b.c'`) or array paths (`['a', 'b', 0, 'c']`).

```typescript
import { deepMap } from 'zen';

const settings = deepMap({ user: { name: 'Anon', preferences: { theme: 'light' } } });

settings.subscribe(state => {
  console.log('Settings updated:', state);
});
// Output: Settings updated: { user: { name: 'Anon', preferences: { theme: 'light' } } }

settings.setKey('user.preferences.theme', 'dark');
// Output: Settings updated: { user: { name: 'Anon', preferences: { theme: 'dark' } } }

settings.setKey(['user', 'name'], 'Alice');
// Output: Settings updated: { user: { name: 'Alice', preferences: { theme: 'dark' } } }
```

### `task(asyncFunction)`

Manages the state (`loading`, `error`, `data`) of an asynchronous operation.

```typescript
import { atom, computed, task } from 'zen';

const userId = atom(1);

const fetchUser = task(async (id: number) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 50));
  if (id === 0) throw new Error('User not found');
  return { id, name: `User ${id}` };
});

const userState = computed([fetchUser], state => {
   if (state.loading) return 'Loading user...';
   if (state.error) return `Error: ${state.error.message}`;
   if (state.data) return `Loaded: ${state.data.name}`;
   return 'Idle';
});

userState.subscribe(console.log);
// Output: Idle

// Run the task
fetchUser.run(userId.get()); // Use get()
// Output: Loading user...
// (after ~50ms) Output: Loaded: User 1

// Example with error
userId.set(0);
fetchUser.run(userId.get()); // Use get()
// Output: Loading user...
// (after ~50ms) Output: Error: User not found
```

### `batch(callback)`

Groups multiple `set` or `setKey` calls into a single notification.

```typescript
import { atom, batch } from 'zen';

const count = atom(0);
const name = atom('A');

const unsub = count.subscribe(c => console.log('Count:', c));
const unsubName = name.subscribe(n => console.log('Name:', n));
// Output: Count: 0
// Output: Name: A

batch(() => {
  count.set(1); // No immediate notification
  name.set('B'); // No immediate notification
  count.set(2); // No immediate notification
});
// Output: Count: 2
// Output: Name: B
// (Listeners are notified only once after the batch completes, with the final values)

unsub();
unsub();
unsubName();
```

### `listen(atom, event, listener)`

Listens to specific lifecycle events on an atom or computed atom.

```typescript
import { atom, listen, LIFECYCLE } from 'zen';

const count = atom(0);

// Listen for the 'onSet' event (called *before* the value is updated)
const unsubSet = listen(count, LIFECYCLE.onSet, (newValue) => {
  console.log(`Setting value to: ${newValue}`);
});

// Listen for the 'onNotify' event (called *after* listeners are notified)
const unsubNotify = listen(count, LIFECYCLE.onNotify, (newValue) => {
    console.log(`Value finished updating to: ${newValue}`);
});

// Listen for 'onStart' (first subscriber) and 'onStop' (last unsubscriber)
const unsubStart = listen(count, LIFECYCLE.onStart, () => console.log('First listener!'));
const unsubStop = listen(count, LIFECYCLE.onStop, () => console.log('Last listener gone.'));


const sub1 = count.subscribe(val => console.log(`Subscriber 1: ${val}`));
// Output: First listener!
// Output: Subscriber 1: 0

count.set(1);
// Output: Setting value to: 1
// Output: Subscriber 1: 1
// Output: Value finished updating to: 1

sub1();
// Output: Last listener gone.

unsubSet();
unsubNotify();
unsubStart();
unsubStop();
```

Available `LIFECYCLE` events:
*   `onMount`: Called immediately when `listen` is called for this event.
*   `onStart`: Called when the *first* regular subscriber (`.subscribe()`) is added.
*   `onStop`: Called when the *last* regular subscriber unsubscribes.
*   `onSet`: Called *before* a new value is set (receives the incoming value).
*   `onNotify`: Called *after* all regular subscribers have been notified of a change (receives the new value).


### `mapAtom.listenKeys(keys, listener)`

Listens for changes to specific top-level keys within a `map` atom.

```typescript
import { map } from 'zen';

const profile = map({ name: 'John', age: 30, city: 'NY' });

// Listen only to 'name' and 'age' changes
const unsubKeys = profile.listenKeys(['name', 'age'], (value, key, fullObject) => {
  console.log(`Key '${key}' changed to: ${value}`);
  // console.log('Full object:', fullObject);
});

profile.setKey('age', 31);
// Output: Key 'age' changed to: 31

profile.setKey('city', 'London');
// No output (not listening to 'city')

profile.set({ name: 'Jane', age: 32, city: 'London' });
// Output: Key 'name' changed to: Jane
// Output: Key 'age' changed to: 32

unsubKeys();
```

### `deepMapAtom.listenPaths(paths, listener)`

Listens for changes occurring at specific deep paths within a `deepMap` atom. Also triggers if a parent path changes.

```typescript
import { deepMap } from 'zen';

const settings = deepMap({ user: { name: 'Anon', prefs: { theme: 'light', notify: true } } });

// Listen to changes at 'user.prefs.theme'
const unsubPath = settings.listenPaths([['user', 'prefs', 'theme']], (value, path, fullObject) => {
  console.log(`Path '${path.join('.')}' changed to: ${value}`);
});

settings.setPath(['user', 'prefs', 'theme'], 'dark');
// Output: Path 'user.prefs.theme' changed to: dark

settings.setPath(['user', 'prefs', 'notify'], false);
// No output (not listening to 'notify')

// Setting a parent path also triggers listeners for descendants (if the descendant value changes)
// Note: The listener receives the specific path that changed ('user.prefs') and its new value.
settings.setPath(['user', 'prefs'], { theme: 'system', notify: true });
// Output: Path 'user.prefs.theme' changed to: system

unsubPath();
```


## Benchmarks

Run `npm run bench` to see performance comparisons (requires dev dependencies).

## Size

Run `npm run size` to see bundle size analysis (requires dev dependencies).

**Current Size (Brotli - Post-Feature-Restore):**
*   `zen (atom only)`: **786 B**
*   `zen (full)`: **1.45 kB**
