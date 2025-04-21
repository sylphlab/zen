# @sylphlab/zen-draft

[![npm version](https://img.shields.io/npm/v/@sylphlab/zen-draft)](https://www.npmjs.com/package/@sylphlab/zen-draft)

Immer-like `produce` function with patch generation, built for the `zen` state management ecosystem.

This package allows you to work with immutable state in a more convenient way by allowing "mutations" on a draft state, while automatically producing the next immutable state and optionally generating JSON patches.

## Installation

```bash
# Using pnpm (recommended for this workspace)
pnpm add @sylphlab/zen-draft @sylphlab/zen-core

# Using npm
npm install @sylphlab/zen-draft @sylphlab/zen-core

# Using yarn
yarn add @sylphlab/zen-draft @sylphlab/zen-core
```

## Usage

### `produce`

The `produce` function takes a base state and a "recipe" function. The recipe function receives a `draft` version of the state that you can mutate directly. `produce` returns the next immutable state. Optionally, you can enable patch generation.

```typescript
import { produce } from '@sylphlab/zen-draft';
import { atom } from '@sylphlab/zen-core';

const myAtom = atom({
  user: { name: 'Alice', age: 30 },
  tags: ['a', 'b']
});

// Get current state
const currentState = myAtom.get();

// Produce the next state using a recipe
const [nextState, patches, inversePatches] = produce(
  currentState,
  (draft) => {
    draft.user.age++;
    draft.tags.push('c');
    delete draft.user.name; // Example deletion
  },
  { patches: true, inversePatches: true } // Enable patch generation
);

// Update the atom with the new state
myAtom.set(nextState);

console.log(currentState);
// Output: { user: { name: 'Alice', age: 30 }, tags: ['a', 'b'] }

console.log(nextState);
// Output: { user: { age: 31 }, tags: ['a', 'b', 'c'] }

console.log(patches);
// Output: [
//   { op: 'replace', path: ['user', 'age'], value: 31 },
//   { op: 'add', path: ['tags', 2], value: 'c' }, // Note: Array index for push
//   { op: 'remove', path: ['user', 'name'] }
// ]

console.log(inversePatches);
// Output: [
//   { op: 'replace', path: ['user', 'age'], value: 30 },
//   { op: 'remove', path: ['tags', 2] },
//   { op: 'add', path: ['user', 'name'], value: 'Alice' }
// ]
```

### `applyPatches`

Applies an array of JSON patches to a base state to produce a new state.

```typescript
import { applyPatches } from '@sylphlab/zen-draft';

const baseState = { user: { name: 'Alice' } };
const patches = [
  { op: 'replace', path: ['user', 'name'], value: 'Bob' },
  { op: 'add', path: ['user', 'age'], value: 40 },
];

const nextState = applyPatches(baseState, patches);

console.log(nextState);
// Output: { user: { name: 'Bob', age: 40 } }
```

## Current Status & TODOs

This is an initial implementation. Known areas for improvement:
*   More robust copy-on-write logic in `produce` for better performance and accuracy.
*   Intercepting specific array mutation methods (`push`, `pop`, `splice`, etc.) for more precise patch generation.
*   Handling non-plain objects (like `Date`, `Map`, `Set`).
*   More comprehensive tests, especially for array mutations and edge cases.
*   Refining the `applyPatches` implementation for robustness and efficiency.

## License

MIT