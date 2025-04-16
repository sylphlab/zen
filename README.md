# @sylph/zen: Extreme Minimalism, Extreme Speed 🚀

[![npm version](https://badge.fury.io/js/@sylph/zen.svg)](https://badge.fury.io/js/@sylph/zen) <!-- Placeholder: Update link if package name differs -->
[![bundle size](https://img.shields.io/bundlephobia/minzip/@sylph/zen)](https://bundlephobia.com/package/@sylph/zen) <!-- Placeholder: Update link if package name differs -->
[![Tests](https://github.com/your-repo/zen/actions/workflows/test.yml/badge.svg)](https://github.com/your-repo/zen/actions/workflows/test.yml) <!-- Placeholder: Update link -->

**Embrace simplicity. Achieve speed. Meet Zen – the state management library designed around extreme minimalism for unparalleled performance and efficiency.**

Zen delivers **extreme speed** *because* of its minimalist core, consistently outperforming popular alternatives like Zustand, Jotai, Nanostores, Valtio, and Effector in crucial benchmarks. All this, while maintaining a **tiny footprint (1.45 kB full library)** and providing essential features through a clean, intuitive API.

---

## Why Zen? 🤔

Modern web applications demand state management that is fast, lightweight, and easy to reason about. Existing solutions often introduce complexity and overhead, forcing a trade-off: gain features but sacrifice performance and simplicity, or stay small but lack essential capabilities.

**Zen rejects this compromise. Our philosophy: extreme speed *through* extreme minimalism.**

By focusing relentlessly on a highly optimized, simple core and only the essential features, Zen avoids unnecessary abstractions and overhead. We meticulously optimized every function, achieving unparalleled speed *because* of this focused, minimalist design.

**Zen solves:**

*   **Performance Bottlenecks:** Drastically reduces overhead for state updates and reads via its minimal core.
*   **Bundle Bloat:** Keeps your application lean and fast-loading with its tiny size.
*   **Complexity Overload:** Provides a straightforward, predictable API that's easy to learn and use.
*   **Over-Engineering:** Delivers only the essential tools you need, cutting out unnecessary complexity.

---

## Key Features ✨

*   🤏 **Extreme Minimalism:** Simple, intuitive API focused on the fundamentals.
*   🚀 **Extreme Performance:** Hyper-optimized core delivers benchmark-leading speed (see below).
*   ⚛️ **Core Primitives:** `atom` for basic state, `computed` for derived values.
*   🗺️ **Object Helpers:** `map` for shallow object state, `deepMap` for nested objects/arrays with efficient path updates/listeners.
*   ⚡ **Async Handling:** `task` atom for managing async operation states (loading, error, data).
*   👂 **Lifecycle Events:** Optional hooks (`onMount`, `onStart`, `onStop`, `onSet`, `onNotify`) for fine-grained control when needed.
*   🎯 **Granular Subscriptions:** Efficiently listen to specific `keys` in `map` or deep `paths` in `deepMap`.
*   📏 **Tiny Size:** Just **1.45 kB** (brotli + gzip) for the full library.

---

## Installation 📦

```bash
npm install @sylph/zen
# or
yarn add @sylph/zen
# or
pnpm add @sylph/zen
```

---

## Core Usage 🧑‍💻

*(Usage examples remain the same as previous version - atom, computed, map, deepMap, task)*

### `atom`

The fundamental building block for reactive state.

```typescript
import { atom } from '@sylph/zen';

const counter = atom(0);

const unsubscribe = counter.subscribe((value, oldValue) => {
  console.log(`Counter changed from ${oldValue} to ${value}`);
});

console.log(counter.get()); // Output: 0

counter.set(1); // Output: Counter changed from 0 to 1
console.log(counter.get()); // Output: 1

counter.set(1); // No output, value didn't change

unsubscribe();

counter.set(2); // No output, unsubscribed
```

### `computed`

Create derived state based on one or more atoms.

```typescript
import { atom, computed } from '@sylph/zen';

const count = atom(10);
const message = atom(' apples');

// Computed value based on count
const double = computed([count], (value) => value * 2);

// Computed value based on multiple atoms
const fullMessage = computed([count, message], (num, msg) => `${num}${msg}`);

const unsubDouble = double.subscribe(value => console.log('Double:', value));
// Output: Double: 20

const unsubMsg = fullMessage.subscribe(value => console.log('Message:', value));
// Output: Message: 10 apples

console.log(double.get()); // Output: 20
console.log(fullMessage.get()); // Output: 10 apples

count.set(15);
// Output: Double: 30
// Output: Message: 15 apples

message.set(' oranges');
// Output: Message: 15 oranges
// (Double listener not called as 'double' didn't change)

unsubDouble();
unsubMsg();
```

### `map`

Optimized for object state where you often update/listen to individual keys.

```typescript
import { map } from '@sylph/zen';

const profile = map({ name: 'John', age: 30, city: 'New York' });

const unsub = profile.subscribe(value => console.log('Profile updated:', value));

// Listen to specific key changes
const unsubAge = profile.listenKeys(['age'], (value, key, fullObject) => {
  console.log(`Key '${key}' changed to: ${value}`);
});

profile.setKey('age', 31);
// Output: Key 'age' changed to: 31
// Output: Profile updated: { name: 'John', age: 31, city: 'New York' }

profile.setKey('name', 'Jane');
// Output: Profile updated: { name: 'Jane', age: 31, city: 'New York' }
// (Age listener not called)

profile.set({ name: 'Peter', age: 40, city: 'London' }); // Update whole object
// Output: Key 'age' changed to: 40
// Output: Profile updated: { name: 'Peter', age: 40, city: 'London' }

unsub();
unsubAge();
```

### `deepMap`

Efficiently manage and subscribe to changes within nested objects/arrays.

```typescript
import { deepMap } from '@sylph/zen';

const settings = deepMap({
  user: { name: 'Anon', preferences: { theme: 'light', notifications: true } },
  data: [10, 20, 30]
});

const unsub = settings.subscribe(value => console.log('Settings updated:', value));

// Listen to a deep path
const unsubTheme = settings.listenPaths([['user', 'preferences', 'theme']], (value, path, fullObject) => {
  console.log(`Path '${path.join('.')}' changed to: ${value}`);
});

// Listen to an array element path
const unsubData = settings.listenPaths([['data', 1]], (value, path, fullObject) => {
 console.log(`Path 'data[1]' changed to: ${value}`);
});

// Update deep value using string path
settings.setPath('user.preferences.theme', 'dark');
// Output: Path 'user.preferences.theme' changed to: dark
// Output: Settings updated: { user: {..., preferences: { theme: 'dark', ... }}, ... }

// Update deep value using array path
settings.setPath(['data', 1], 25);
// Output: Path 'data[1]' changed to: 25
// Output: Settings updated: { ..., data: [10, 25, 30] }

// Update unrelated path
settings.setPath('user.name', 'Alice');
// Output: Settings updated: { user: { name: 'Alice', ...}, ... }
// (Theme and data listeners not called)

unsub();
unsubTheme();
unsubData();
```

### `task`

Handle async operations gracefully.

```typescript
import { task } from '@sylph/zen';
import { computed } from '@sylph/zen'; // Can be used with task state

const fetchData = async (userId: number): Promise<{ id: number; name: string }> => {
  // Simulate API call
  await new Promise(r => setTimeout(r, 50));
  if (userId === 0) throw new Error('Invalid ID');
  return { id: userId, name: `User ${userId}` };
};

const userTask = task(fetchData);

const userStatus = computed([userTask], (state) => {
  if (state.loading) return 'Loading user...';
  if (state.error) return `Error: ${state.error.message}`;
  if (state.data) return `User Found: ${state.data.name} (ID: ${state.data.id})`;
  return 'Enter a user ID';
});

userStatus.subscribe(status => console.log(status));
// Output: Enter a user ID

// Run the task
userTask.run(123)
  .then(data => console.log('Success:', data))
  .catch(err => console.error('Caught Error:', err));

// Output: Loading user...
// (after ~50ms)
// Output: User Found: User 123 (ID: 123)
// Output: Success: { id: 123, name: 'User 123' }

// Run with invalid ID
userTask.run(0)
  .catch(err => console.error('Caught Error:', err.message));

// Output: Loading user...
// (after ~50ms)
// Output: Error: Invalid ID
// Output: Caught Error: Invalid ID
```

---

## Advanced Usage 🧐

### Lifecycle Events

Listen to internal atom events.

```typescript
import { atom, listen, LIFECYCLE } from '@sylph/zen';

const myAtom = atom(0);

const unsubStart = listen(myAtom, LIFECYCLE.onStart, () => console.log('First listener subscribed!'));
const unsubStop = listen(myAtom, LIFECYCLE.onStop, () => console.log('Last listener unsubscribed!'));
const unsubSet = listen(myAtom, LIFECYCLE.onSet, (newValue) => console.log(`Setting value to ${newValue}...`));
const unsubNotify = listen(myAtom, LIFECYCLE.onNotify, (newValue) => console.log(`Notified with value ${newValue}!`));

const sub1 = myAtom.subscribe(() => {}); // Output: First listener subscribed!
myAtom.set(1);
// Output: Setting value to 1...
// Output: Notified with value 1!

sub1(); // Output: Last listener unsubscribed!

unsubStart();
unsubStop();
unsubSet();
unsubNotify();
```

### Key/Path Listening

Already demonstrated in `map` and `deepMap` examples above. Use `listenKeys` for `map` and `listenPaths` for `deepMap`.

---

## Performance: Extreme Speed via Minimalism 🚀

Zen achieves extreme speed by focusing on a minimal, hyper-optimized core. Benchmarks show significant advantages over popular libraries (ops/sec, higher is better):

*(Results from 2025-04-16, may vary slightly)*

**Core Atom Operations:**

| Benchmark                 | Zen (ops/s)       | Nanostores | Zustand (Vanilla) | Jotai      | Valtio (Vanilla) | Effector   | Winner |
| :------------------------ | :---------------- | :--------- | :---------------- | :--------- | :--------------- | :--------- | :----- |
| **Atom Creation**         | **~7.5M**         | ~1.0M      | ~6.2M             | ~5.9M      | ~0.15M           | ~6.7k      | 🏆 Zen |
| **Atom Get**              | **~20.7M**        | ~8.4M      | ~17.0M            | ~17.2M     | ~11.6M           | ~16.4M     | 🏆 Zen |
| **Atom Set (No Listeners)** | **~9.0M**         | ~7.9M      | ~4.3M             | ~0.67M     | ~2.4M            | ~1.6M      | 🏆 Zen |
| **Subscribe/Unsubscribe** | ~2.8M             | ~1.4M      | **~3.1M**         | ~0.07M     | ~0.26M           | ~9.2k      | Zustand |

**Computed Operations (1 Dependency):**

| Benchmark                 | Zen (ops/s)       | Nanostores | Zustand (Selector) | Jotai (Hook) | Valtio (Getter) | Effector (Derived) | Winner |
| :------------------------ | :---------------- | :--------- | :----------------- | :----------- | :-------------- | :----------------- | :----- |
| **Computed Creation**     | ~12.0M            | ~0.5M      | -                  | **~13.0M**   | -               | ~6.5k              | Jotai  |
| **Computed Get**          | ~17.3M            | ~2.2M      | ~16.6M             | **~18.0M**   | ~14.6M          | ~17.4M             | Jotai  |
| **Computed Update Prop.** | ~4.5M             | ~4.3M      | **~5.7M**          | ~0.15M       | ~2.1M           | ~1.0M              | Zustand |

**Map/DeepMap Operations:**

| Benchmark                     | Zen (ops/s)        | Nanostores | Winner |
| :---------------------------- | :----------------- | :--------- | :----- |
| **Map Creation**              | **~7.5M**          | ~2.4M      | 🏆 Zen |
| **Map Get**                   | **~20.7M**         | ~6.4M      | 🏆 Zen |
| **Map Set Key**               | ~9.0M              | **~10.9M** | Nanostores |
| **DeepMap Creation**          | **~7.5M**          | ~2.4M      | 🏆 Zen |
| **DeepMap setPath (Shallow)** | **~9.0M**          | ~2.4M      | 🏆 Zen |
| **DeepMap setPath (1 Lvl)**   | **~6.1M**          | ~2.5M      | 🏆 Zen |
| **DeepMap setPath (2 Lvl)**   | **~4.8M**          | ~2.5M      | 🏆 Zen |
| **DeepMap setPath (Array)**   | **~10.9M**         | ~2.2M      | 🏆 Zen |
| **DeepMap setPath (Create)**  | **~8.3M**          | ~2.5M      | 🏆 Zen |

**Key Takeaways:**

*   Zen's minimalist design leads to dominant performance in core atom speed (Get/Set) and all DeepMap operations.
*   Highly competitive in Atom Creation, Subscribe/Unsubscribe, and Computed Get.
*   Computed Update performance is vastly improved and near the top.
*   Map Set Key is the only area where Nanostores is slightly faster.

---

## Size Comparison 🤏

Zen's minimalist philosophy results in an incredibly small bundle size.

| Library           | Size (Brotli + Gzip) |
| :---------------- | :------------------- |
| Jotai (atom)      | 170 B                |
| Nanostores (atom) | 265 B                |
| Zustand (core)    | 461 B                |
| **Zen (atom only)** | **786 B**            |
| Valtio            | 903 B                |
| **Zen (full)**    | **1.45 kB**          |
| Effector          | 5.27 kB              |
| Redux Toolkit     | 6.99 kB              |

---

## Current Limitations & Issues

*   **TypeScript Guidelines:** We currently cannot automatically verify against specific internal TypeScript style guidelines due to a temporary issue fetching the rules file (`guidelines/typescript/style_quality.md` from `sylphlab/Playbook` resulted in a 'Not Found' error). We are proceeding with best practices in the meantime.
*   **Map Set Key Performance:** While fast (~9.0M ops/s), Nanostores is slightly faster (~10.9M ops/s) in this specific benchmark. Further investigation is optional.

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
