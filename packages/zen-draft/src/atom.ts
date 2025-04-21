import { get, set } from '@sylphlab/zen-core';
import type { Atom } from '@sylphlab/zen-core';
import { produce } from './produce';
import type { Patch, ProduceOptions } from './types';

/**
 * Produces the next state for a writable zen atom by applying a recipe function
 * to a draft version of the atom's current state. Automatically updates the atom.
 * Returns the generated patches and inverse patches.
 *
 * @param targetAtom The writable zen atom to update.
 * @param recipe A function that receives a draft state and can mutate it.
 * @param options Options to enable patch generation.
 * @returns A tuple containing the generated patches and inverse patches: [Patch[], Patch[]]
 */
export function produceAtom<T>(
  targetAtom: Atom<T>, // Use the correct Atom type
  recipe: (draft: T) => undefined | T,
  options?: ProduceOptions,
): [Patch[], Patch[]] {
  const currentState = get(targetAtom); // Use get() function
  const [nextState, patches, inversePatches] = produce(currentState, recipe, options);

  // Only set the atom if the state actually changed
  if (nextState !== currentState) {
    set(targetAtom, nextState); // Use set() function
  }

  return [patches, inversePatches];
}
