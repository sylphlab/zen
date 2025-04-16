// Type guard functions to differentiate between various atom types at runtime.
import type { AnyAtom, MapAtom, DeepMapAtom, TaskAtom } from './types'; // Import AnyAtom and merged types
import type { Atom } from './atom'; // Import specific types
import type { ComputedAtom } from './computed'; // Import specific types
// Removed imports for MapAtom, DeepMapAtom, TaskAtom from their original files

export function isAtom<T>(a: AnyAtom<T>): a is Atom<T> {
    return a._kind === 'atom';
}

export function isComputedAtom<T>(a: AnyAtom<T>): a is ComputedAtom<T> {
    return a._kind === 'computed';
}

// Return boolean as predicate causes issues with generics
export function isMapOrDeepMapAtom<T>(a: AnyAtom<T>): boolean {
    return a._kind === 'map' || a._kind === 'deepMap';
}

// Specific guards if needed later
// export function isMapAtom<T>(a: AnyAtom<T>): a is MapAtom {
//     return a._kind === 'map';
// }
// export function isDeepMapAtom<T>(a: AnyAtom<T>): a is DeepMapAtom {
//     return a._kind === 'deepMap';
// }

// Return boolean as predicate causes issues with generics
export function isTaskAtom<T>(a: AnyAtom<T>): boolean {
    return a._kind === 'task';
}