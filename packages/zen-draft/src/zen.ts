import { get, set } from '@sylphlab/zen-core';
import type { Zen } from '@sylphlab/zen-core';
import { produce } from './produce';
import type { Patch, ProduceOptions } from './types';
import { deepEqual } from './utils'; // Import deepEqual

/**
 * Produces the next state for a writable zen by applying a recipe function
 * to a draft version of the zen's current state. Automatically updates the zen.
 * Returns the generated patches and inverse patches.
 *
 * @param targetZen The writable zen to update.
 * @param recipe A function that receives a draft state and can mutate it.
 * @param options Options to enable patch generation.
 * @returns A tuple containing the generated patches and inverse patches: [Patch[], Patch[]]
 */
export function produceZen<T>(
  targetZen: Zen<T>, // Use the correct Zen type
  recipe: (draft: T) => undefined, // Match simplified produce signature
  options?: ProduceOptions,
): [Patch[], Patch[]] {
  const currentState = get(targetZen); // Use get() function
  const [nextState, patches, inversePatches] = produce(currentState, recipe, options);

  // Only set the zen if the state value actually changed (use deep equality)
  if (!deepEqual(nextState, currentState)) {
    set(targetZen, nextState); // Use set() function
  }

  return [patches, inversePatches];
}
