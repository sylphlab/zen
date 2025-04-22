import {
  type Patch as ImmerPatch, // Import Immer's Patch type
  enableMapSet, // Import MapSet plugin enabler
  enablePatches,
  produce as immerProduce,
  produceWithPatches,
} from 'immer';
import type { ProduceOptions, ProduceResult, Patch as ZenPatch } from './types';
import { isDraftable } from './utils'; // Only import used utils

// Enable Immer plugins
enablePatches();
enableMapSet();

// Helper to map Immer patches to our Patch format if needed
// NOTE: Immer's patch path uses strings, ours uses (string | number)[]
// Immer uses standard add/replace/remove for Maps.
// For Sets, Immer uses add/remove with path like ['set', index/value] and includes the value.
// We need to map Immer's representation to our custom set_add/set_delete.
function mapImmerPatches(immerPatches: ReadonlyArray<ImmerPatch>): ZenPatch[] {
  const mapped: ZenPatch[] = [];
  for (const p of immerPatches) {
    const mappedPath = p.path.map((segment) => {
      const num = Number(segment);
      // Check specifically for non-negative integers for array indices
      return Number.isInteger(num) && num >= 0 ? num : segment;
    });

    // Check for Set operations based on Immer's observed output format
    // Path like ['setName', index], op 'add'/'remove', value is the element
    // Map to { op: 'set_add'/'set_delete', path: ['setName'], value: VALUE }
    if (mappedPath.length === 2 && mappedPath[0] === 'set' && typeof mappedPath[1] === 'number') {
      // Check path structure ['set', number]
      if (p.op === 'add' && p.value !== undefined) {
        mapped.push({ op: 'set_add', path: [mappedPath[0]], value: p.value });
        continue; // Skip default push
      }
      if (p.op === 'remove' && p.value !== undefined) {
        mapped.push({ op: 'set_delete', path: [mappedPath[0]], value: p.value });
        continue; // Skip default push
      }
    }

    // Standard mapping for other ops (Map ops, array/object ops)
    mapped.push({ ...p, path: mappedPath });
  }
  return mapped;
}

// Remove generic R, recipe must return void or undefined
export function produce<T>(
  baseState: T,
  recipe: (draft: T) => undefined, // Use undefined only
  options?: ProduceOptions,
): ProduceResult<T> {
  // Return type uses T
  // Handle non-draftable state directly (no patches)
  if (!isDraftable(baseState)) {
    // Recipe for non-draftable state shouldn't return anything meaningful here
    recipe(baseState as T);
    const finalState: T = baseState; // Always return base for non-draftable
    // Freezing handled by Immer for draftable, skip manual freeze here
    // if (options?.autoFreeze && ...) { ... }
    // Let's assume options.autoFreeze aligns with Immer's default for now.
    // if (options?.autoFreeze === false) { /* Can't easily unfreeze */ }
    return [finalState as T, [], []]; // Use T
  }

  const generatePatches = options?.patches ?? false;
  const generateInversePatches = options?.inversePatches ?? false;

  if (generatePatches || generateInversePatches) {
    // Cast recipe type for Immer's stricter expectation if needed,
    // although void | undefined should be assignable to ValidRecipeReturnType
    const recipeForImmer = recipe as (draft: T) => void;
    const [finalState, patches, inversePatches] = produceWithPatches(baseState, recipeForImmer);
    // Map Immer patches to our format
    // NOTE: Passing baseState here would be needed for a truly robust Set check,
    // but we are using a heuristic in mapImmerPatches for now.
    const mappedPatches = generatePatches ? mapImmerPatches(patches) : [];
    const mappedInversePatches = generateInversePatches ? mapImmerPatches(inversePatches) : [];
    return [finalState as T, mappedPatches, mappedInversePatches]; // Use T
  }
  // Use standard immer produce if patches are not needed
  const recipeForImmer = recipe as (draft: T) => void;
  const finalState = immerProduce(baseState, recipeForImmer);
  return [finalState as T, [], []]; // Use T
}

// Note: Immer handles auto-freezing by default. If options.autoFreeze is false,
// this implementation currently cannot prevent Immer from freezing.
// A more complex setup involving disabling Immer's freeze and manually calling deepFreeze
// would be needed if strict adherence to autoFreeze: false is required.
