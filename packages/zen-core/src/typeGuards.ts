// Type guard functions to differentiate between various atom types at runtime.
import type { AnyAtom } from './types'; // Import AnyAtom
import type { Atom } from './atom'; // Import specific types
import type { ComputedAtom } from './computed'; // Import specific types
import type { MapAtom } from './map'; // Import specific types
import type { DeepMapAtom } from './deepMap'; // Import specific types
import type { TaskAtom } from './task'; // Import specific types

export function isAtom<T>(a: AnyAtom<T>): a is Atom<T> {
    // It's a regular atom if it has _value and none of the distinguishing properties of others
    return '_value' in a && !('_calculation' in a) && !('_internalAtom' in a) && !('_stateAtom' in a);
}

export function isComputedAtom<T>(a: AnyAtom<T>): a is ComputedAtom<T> {
    return '_calculation' in a;
}

export function isMapOrDeepMapAtom<T>(a: AnyAtom<T>): a is MapAtom<T extends object ? T : any> | DeepMapAtom<T extends object ? T : any> {
    return '_internalAtom' in a;
}

// We might need more specific checks if MapAtom and DeepMapAtom need differentiation here later

export function isTaskAtom<T>(a: AnyAtom<T>): a is TaskAtom<T> {
    return '_stateAtom' in a;
}