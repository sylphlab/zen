import { get, set } from '@sylphlab/zen-core'; // Import get and set functions
import type { Atom } from '@sylphlab/zen-core'; // Use Atom type
import { isDraftable, isMap, isSet } from './utils'; // Add Map/Set checks

// Define the Patch structure, including standard ops, plus custom ops for Sets
export interface Patch {
  op: 'replace' | 'add' | 'remove' | 'move' | 'copy' | 'test' | 'set_add' | 'set_delete'; // Add standard ops + custom Set ops
  path: (string | number)[]; // Target path
  value?: unknown; // Value used for add, replace, test, set_add, set_delete
  from?: (string | number)[]; // Source path used for move, copy
}

// Options for the produce function
export interface ProduceOptions {
  patches?: boolean;
  inversePatches?: boolean;
  autoFreeze?: boolean; // Add autoFreeze option
}

// Result tuple type
export type ProduceResult<T> = [T, Patch[], Patch[]];

// The core produce function
export function produce<T>(
  baseState: T,
  recipe: (draft: T) => undefined | T, // Recipe can modify draft or return a new state
  options?: ProduceOptions,
): ProduceResult<T> {
  if (!isDraftable(baseState)) {
    const result = recipe(baseState as T); // Try calling recipe directly
    const finalState = result === undefined ? baseState : result;
    // Auto-freeze non-draftable results if requested (won't be recursive)
    if (
      options?.autoFreeze &&
      finalState !== baseState &&
      typeof finalState === 'object' &&
      finalState !== null
    ) {
      Object.freeze(finalState);
    }
    return [finalState, [], []];
  }

  const patches: Patch[] = [];
  const inversePatches: Patch[] = [];
  const generatePatches = options?.patches ?? false;
  const generateInversePatches = options?.inversePatches ?? false;

  const proxyCache = new Map<object, object>();
  const copies = new Map<object, object>();
  const mutatedObjects = new WeakSet<object>(); // Track originals that have copies

  // Store original values for inverse patches, keyed by the *copied* draft object and prop
  const originalValues = new Map<object, Map<string | symbol, unknown>>();

  function createProxyHandler(base: object, path: (string | number)[] = []): ProxyHandler<object> {
    const ensureMutableCopy = (): object => {
      if (!copies.has(base)) {
        let copy: object;
        if (Array.isArray(base)) {
          copy = [...base];
        } else if (isMap(base)) {
          copy = new Map(base as Map<unknown, unknown>);
        } else if (isSet(base)) {
          copy = new Set(base as Set<unknown>);
        } else {
          // Plain object
          copy = { ...base };
        }
        copies.set(base, copy);
        mutatedObjects.add(base);
        if (generateInversePatches && originalValues.has(base)) {
          originalValues.set(copy, new Map(originalValues.get(base)!));
        }
        return copy;
      }
      return copies.get(base)!;
    };

    return {
      get(_target, prop, receiver) {
        const currentTarget = copies.get(base) ?? base;

        // --- Intercept Map methods ---
        if (isMap(currentTarget) && mapMutatingMethods[prop as keyof MapMutatingMethods]) {
          ensureMutableCopy();
          const method = prop as keyof MapMutatingMethods;
          return (...args: unknown[]) => {
            const copy = copies.get(base)! as Map<unknown, unknown>;
            const key = args[0];
            const hasOldValue = copy.has(key);
            const oldValue = hasOldValue ? copy.get(key) : undefined;

            if (generateInversePatches) {
              if (!originalValues.has(copy)) originalValues.set(copy, new Map());
              const copyOriginals = originalValues.get(copy)!;
              // Fix: Ensure mapKey is string | symbol
              const mapKey: string | symbol = typeof key === 'symbol' ? key : String(key);
              if (!copyOriginals.has(mapKey)) {
                copyOriginals.set(mapKey, oldValue);
              }
            }

            let result: unknown;
            if (method === 'clear') {
              if (generatePatches && copy.size > 0) {
                const oldMapContent = generateInversePatches ? new Map(copy) : undefined;
                for (const k of Array.from(copy.keys())) {
                  const currentPath = [...path, k as string | number];
                  patches.push({ op: 'remove', path: currentPath });
                  if (generateInversePatches) {
                    const originalVal = oldMapContent?.get(k);
                    inversePatches.push({ op: 'add', path: currentPath, value: originalVal });
                  }
                }
                if (generateInversePatches) inversePatches.reverse();
              }
              result = copy.clear();
            } else {
              // Use type assertion for apply
              result = (copy[method] as (...args: unknown[]) => unknown).apply(copy, args);
            }

            if (generatePatches && method !== 'clear') {
              const currentPath = [...path, key as string | number];
              if (method === 'set') {
                const op = hasOldValue ? 'replace' : 'add';
                patches.push({ op, path: currentPath, value: args[1] });
                if (generateInversePatches) {
                  const copyOriginals = originalValues.get(copy);
                  const mapKey: string | symbol = typeof key === 'symbol' ? key : String(key);
                  const originalVal = copyOriginals?.get(mapKey);
                  const inverseOp = op === 'add' ? 'remove' : 'replace';
                  inversePatches.push({
                    op: inverseOp,
                    path: currentPath,
                    value: op === 'add' ? undefined : originalVal,
                  });
                }
              } else if (method === 'delete') {
                if (result === true) {
                  patches.push({ op: 'remove', path: currentPath });
                  if (generateInversePatches) {
                    const copyOriginals = originalValues.get(copy);
                    const mapKey: string | symbol = typeof key === 'symbol' ? key : String(key);
                    const originalVal = copyOriginals?.get(mapKey);
                    inversePatches.push({ op: 'add', path: currentPath, value: originalVal });
                  }
                }
              }
            }
            return result;
          };
        }
        // --- End Map Interception ---

        // --- Intercept Set methods ---
        if (isSet(currentTarget) && setMutatingMethods[prop as keyof SetMutatingMethods]) {
          ensureMutableCopy();
          const method = prop as keyof SetMutatingMethods;
          return (...args: unknown[]) => {
            const copy = copies.get(base)! as Set<unknown>;
            const originalSetAsArray = generateInversePatches ? Array.from(copy) : undefined;
            const value = args[0];

            let result: unknown;
            let valueWasAdded = false;
            let valueWasDeleted = false;

            if (method === 'clear') {
              result = copy.clear();
            } else if (method === 'add') {
              const hasBefore = copy.has(value);
              result = copy.add(value);
              valueWasAdded = !hasBefore && copy.has(value);
            } else if (method === 'delete') {
              result = copy.delete(value);
              valueWasDeleted = result === true;
            } else {
              result = undefined;
            }

            if (generatePatches) {
              const currentPath = [...path];
              if (method === 'add' && valueWasAdded) {
                patches.push({ op: 'set_add', path: currentPath, value });
                if (generateInversePatches) {
                  inversePatches.push({ op: 'set_delete', path: currentPath, value });
                }
              } else if (method === 'delete' && valueWasDeleted) {
                patches.push({ op: 'set_delete', path: currentPath, value });
                if (generateInversePatches) {
                  inversePatches.push({ op: 'set_add', path: currentPath, value });
                }
              } else if (method === 'clear') {
                if (originalSetAsArray && originalSetAsArray.length > 0) {
                  patches.push({ op: 'replace', path: currentPath, value: [] });
                  if (generateInversePatches) {
                    inversePatches.push({
                      op: 'replace',
                      path: currentPath,
                      value: originalSetAsArray,
                    });
                  }
                }
              }
            }
            return result;
          };
        }
        // --- End Set Interception ---

        // --- Intercept array mutation methods ---
        if (
          Array.isArray(currentTarget) &&
          arrayMutatingMethods[prop as keyof ArrayMutatingMethods]
        ) {
          ensureMutableCopy();
          const method = prop as keyof ArrayMutatingMethods;
          return (...args: unknown[]) => {
            const copy = copies.get(base)! as unknown[];
            const originalLength = copy.length;
            let removedElements: unknown[] | undefined;

            if (generateInversePatches) {
              if (method === 'splice') {
                removedElements = copy.slice(
                  args[0] as number,
                  (args[0] as number) + ((args[1] as number) ?? 0),
                );
              } else if (method === 'pop') {
                removedElements = copy.length > 0 ? [copy[copy.length - 1]] : [];
              } else if (method === 'shift') {
                removedElements = copy.length > 0 ? [copy[0]] : [];
              }
            }

            let result: unknown;
            if (method === 'sort') {
              const originalArray = generateInversePatches ? [...copy] : undefined;
              // Fix: Ensure compareFn returns number
              const compareFn = args[0] as ((a: unknown, b: unknown) => number) | undefined;
              result = copy.sort(compareFn);
              if (generatePatches) {
                patches.push({ op: 'replace', path: [...path], value: [...copy] });
                if (generateInversePatches) {
                  inversePatches.push({ op: 'replace', path: [...path], value: originalArray });
                }
              }
            } else if (method === 'reverse') {
              const originalArray = generateInversePatches ? [...copy] : undefined;
              result = copy.reverse();
              if (generatePatches) {
                patches.push({ op: 'replace', path: [...path], value: [...copy] });
                if (generateInversePatches) {
                  inversePatches.push({ op: 'replace', path: [...path], value: originalArray });
                }
              }
            } else {
              // Fix: Call methods directly instead of apply for better type safety
              switch (method) {
                case 'push':
                  result = copy.push(...args);
                  break;
                case 'pop':
                  result = copy.pop();
                  break;
                case 'shift':
                  result = copy.shift();
                  break;
                case 'unshift':
                  result = copy.unshift(...args);
                  break;
                case 'splice':
                  // Ensure args are correctly typed for splice
                  result = copy.splice(
                    args[0] as number,
                    (args[1] as number) ?? undefined,
                    ...args.slice(2),
                  );
                  break;
                default:
                  result = undefined;
              }
              const newLength = copy.length;

              if (generatePatches) {
                switch (method) {
                  case 'push':
                    for (let i = originalLength; i < newLength; i++) {
                      patches.push({ op: 'add', path: [...path, i], value: copy[i] });
                      if (generateInversePatches) {
                        inversePatches.push({ op: 'remove', path: [...path, i] });
                      }
                    }
                    break;
                  case 'pop':
                    if (originalLength > 0) {
                      patches.push({ op: 'remove', path: [...path, originalLength - 1] });
                      if (generateInversePatches && removedElements) {
                        inversePatches.push({
                          op: 'add',
                          path: [...path, originalLength - 1],
                          value: removedElements[0],
                        });
                      }
                    }
                    break;
                  case 'shift':
                    if (originalLength > 0) {
                      patches.push({ op: 'remove', path: [...path, 0] });
                      if (generateInversePatches && removedElements) {
                        inversePatches.push({
                          op: 'add',
                          path: [...path, 0],
                          value: removedElements[0],
                        });
                      }
                    }
                    break;
                  case 'unshift':
                    for (let i = 0; i < args.length; i++) {
                      patches.push({ op: 'add', path: [...path, i], value: copy[i] });
                      if (generateInversePatches) {
                        inversePatches.push({ op: 'remove', path: [...path, i] });
                      }
                    }
                    break;
                  case 'splice': {
                    const startIndex = args[0] as number;
                    const deleteCount = (args[1] as number) ?? 0;
                    const itemsToAdd = args.slice(2);
                    for (let i = 0; i < deleteCount; i++) {
                      const removeIndex = startIndex;
                      patches.push({ op: 'remove', path: [...path, removeIndex] });
                      if (generateInversePatches && removedElements) {
                        inversePatches.push({
                          op: 'add',
                          path: [...path, startIndex + i],
                          value: removedElements[i],
                        });
                      }
                    }
                    for (let i = 0; i < itemsToAdd.length; i++) {
                      const addIndex = startIndex + i;
                      patches.push({ op: 'add', path: [...path, addIndex], value: itemsToAdd[i] });
                      if (generateInversePatches) {
                        inversePatches.push({ op: 'remove', path: [...path, addIndex] });
                      }
                    }
                    if (generateInversePatches) inversePatches.reverse();
                    break;
                  }
                }
              }
            }
            return result;
          };
        }
        // --- End Array Interception ---

        const value = Reflect.get(currentTarget, prop, receiver);

        if (isDraftable(value)) {
          if (!proxyCache.has(value as object)) {
            const newPath = [...path, prop as string | number];
            const nestedProxy = new Proxy(
              value as object,
              createProxyHandler(value as object, newPath),
            );
            proxyCache.set(value as object, nestedProxy);
            return nestedProxy;
          }
          return proxyCache.get(value as object);
        }
        return value;
      },
      set(_target, prop, value, _receiver) {
        const copy = ensureMutableCopy();
        const currentValue = Reflect.get(copy, prop);

        if (Object.is(currentValue, value)) {
          return true;
        }

        if (generateInversePatches) {
          if (!originalValues.has(copy)) {
            originalValues.set(copy, new Map());
          }
          const copyOriginals = originalValues.get(copy)!;
          if (!copyOriginals.has(prop)) {
            copyOriginals.set(prop, currentValue);
          }
        }

        if (generatePatches) {
          const isArrayIndex = Array.isArray(copy) && /^\d+$/.test(prop.toString());
          const numericProp = isArrayIndex ? Number(prop) : (prop as string | number);
          const currentPath = [...path, numericProp];
          let op: 'add' | 'replace';
          if (isArrayIndex) {
            op = (numericProp as number) >= copy.length ? 'add' : 'replace';
          } else {
            op = Reflect.has(copy, prop) ? 'replace' : 'add';
          }
          patches.push({ op, path: currentPath, value });

          if (generateInversePatches) {
            const copyOriginals = originalValues.get(copy);
            const originalVal = copyOriginals?.get(prop);
            let inverseOp: 'remove' | 'replace';
            let inverseValue: unknown;
            if (op === 'add') {
              inverseOp = 'remove';
              inverseValue = undefined;
            } else {
              inverseOp = 'replace';
              inverseValue = originalVal;
            }
            inversePatches.push({ op: inverseOp, path: currentPath, value: inverseValue });
          }
        }
        return Reflect.set(copy, prop, value);
      },
      deleteProperty(_target, prop) {
        const copy = ensureMutableCopy();
        if (!Reflect.has(copy, prop)) {
          return true;
        }
        const currentValue = Reflect.get(copy, prop);

        if (generateInversePatches) {
          if (!originalValues.has(copy)) {
            originalValues.set(copy, new Map());
          }
          const copyOriginals = originalValues.get(copy)!;
          if (!copyOriginals.has(prop)) {
            copyOriginals.set(prop, currentValue);
          }
        }

        if (generatePatches) {
          const isArrayIndex = Array.isArray(copy) && /^\d+$/.test(prop.toString());
          const numericProp = isArrayIndex ? Number(prop) : (prop as string | number);
          const currentPath = [...path, numericProp];
          patches.push({ op: 'remove', path: currentPath });

          if (generateInversePatches) {
            const copyOriginals = originalValues.get(copy);
            const originalVal = copyOriginals?.get(prop);
            inversePatches.push({ op: 'add', path: currentPath, value: originalVal });
          }
        }
        return Reflect.deleteProperty(copy, prop);
      },
    };
  }

  // --- Helper for array method interception ---
  type ArrayMutatingMethods = {
    push: (...items: unknown[]) => number;
    pop: () => unknown | undefined;
    shift: () => unknown | undefined;
    unshift: (...items: unknown[]) => number;
    splice: (start: number, deleteCount?: number, ...items: unknown[]) => unknown[];
    sort: (compareFn?: (a: unknown, b: unknown) => number) => unknown[];
    reverse: () => unknown[];
  };
  const arrayMutatingMethods: { [K in keyof ArrayMutatingMethods]: true } = {
    push: true,
    pop: true,
    shift: true,
    unshift: true,
    splice: true,
    sort: true,
    reverse: true,
  };
  // --- End Array Helper ---

  // --- Helper for Map method interception ---
  type MapMutatingMethods = {
    set: (key: unknown, value: unknown) => Map<unknown, unknown>;
    delete: (key: unknown) => boolean;
    clear: () => void;
  };
  const mapMutatingMethods: { [K in keyof MapMutatingMethods]: true } = {
    set: true,
    delete: true,
    clear: true,
  };
  // --- End Map Helper ---

  // --- Helper for Set method interception ---
  type SetMutatingMethods = {
    add: (value: unknown) => Set<unknown>;
    delete: (value: unknown) => boolean;
    clear: () => void;
  };
  const setMutatingMethods: { [K in keyof SetMutatingMethods]: true } = {
    add: true,
    delete: true,
    clear: true,
  };
  // --- End Set Helper ---

  // Create the root draft state using Proxy, passing the base state and initial empty path
  const draft = new Proxy(baseState as object, createProxyHandler(baseState as object));
  proxyCache.set(baseState as object, draft); // Add root base state to proxy cache mapping

  // Call the recipe function with the draft
  const recipeResult = recipe(draft as T);

  // Determine the final state using the Copy-on-Write result
  let finalState = baseState; // Start assuming no changes

  if (recipeResult !== undefined) {
    // If recipe returns a value, it overrides everything
    finalState = recipeResult;
    // Immer doesn't generate patches when a value is returned. Mimic this.
    patches.length = 0;
    inversePatches.length = 0;
  } else if (copies.has(baseState as object)) {
    // If the root base state itself was copied (meaning it or a child was mutated), return the copy
    finalState = copies.get(baseState as object) as T;
  }
  // If recipeResult is undefined and the root base state was *not* copied,
  // it means no mutations occurred that affect the root's identity,
  // so we return the original baseState. finalState already holds baseState here.

  // Cleanup caches for this run
  proxyCache.clear();
  copies.clear();
  originalValues.clear();
  // mutatedObjects doesn't need clearing (WeakSet)

  // Auto-freeze the final state if requested
  if (options?.autoFreeze && finalState !== baseState) {
    deepFreeze(finalState);
  }

  return [finalState as T, patches, inversePatches];
}

// --- Auto-Freeze Implementation ---
function deepFreeze(obj: unknown) {
  // Avoid freezing non-objects or already frozen objects
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return;
  }

  // Avoid freezing specific types that shouldn't be frozen
  if (
    obj instanceof Date ||
    obj instanceof RegExp ||
    obj instanceof Map ||
    obj instanceof Set ||
    obj instanceof Promise
  ) {
    return;
  }

  // Basic freeze for objects/arrays:
  if (Array.isArray(obj) || Object.getPrototypeOf(obj) === Object.prototype) {
    Object.freeze(obj);
    // Recursively freeze properties/elements
    Object.keys(obj).forEach((key) => {
      // Use type assertion after check
      deepFreeze((obj as Record<string, unknown>)[key]);
    });
  }
  // Note: This basic deepFreeze might not cover all edge cases handled by Immer's freeze.
}
// --- End Auto-Freeze ---

// Applies JSON patches to a state immutably
export function applyPatches<T>(baseState: T, patches: Patch[]): T {
  if (!patches.length) {
    return baseState;
  }

  // Implement lazy Copy-on-Write within applyPatches
  let currentState: T | undefined = baseState; // Start with base state
  const copies = new Map<object, object>(); // Track copies made during this application

  // Helper to safely get a value by path array
  const getValueByPath = (target: unknown, path: (string | number)[]): unknown => {
    let current: unknown = target;
    for (const segment of path) {
      if (current === null || typeof current !== 'object' || segment === undefined) {
        return undefined;
      }
      if (isMap(current)) {
        current = current.get(segment);
      } else if (isSet(current)) {
        return undefined; // Cannot traverse *into* a Set via path segment
      } else if (typeof segment === 'string' || typeof segment === 'number') {
        // Safely index after checking it's an object
        current = (current as Record<string | number, unknown>)[segment];
      } else {
        return undefined; // Invalid segment type
      }
    }
    return current;
  };

  // Helper to get mutable copy for a specific object within the current state
  const ensureMutable = <O extends object>(obj: O): O => {
    if (!isDraftable(obj) || copies.has(obj)) {
      return (copies.get(obj) as O) ?? obj;
    }
    let copy: O;
    if (Array.isArray(obj)) {
      copy = [...obj] as O;
    } else if (isMap(obj)) {
      copy = new Map(obj as Map<unknown, unknown>) as O;
    } else if (isSet(obj)) {
      copy = new Set(obj as Set<unknown>) as O;
    } else {
      // Plain object
      copy = { ...obj };
    }
    copies.set(obj, copy);
    return copy;
  };

  for (const patch of patches) {
    const path = patch.path;
    if (path.length === 0) {
      // Handle root operations
      if (patch.op === 'replace' || patch.op === 'add') {
        currentState = patch.value as T;
      } else if (patch.op === 'remove') {
        currentState = undefined;
      } else if (patch.op === 'test') {
        if (JSON.stringify(currentState) !== JSON.stringify(patch.value)) {
          throw new Error(`'test' operation failed at root path.`);
        }
      } else {
      }
      continue;
    }

    // Navigate to the parent, creating copies along the way if necessary
    let parent: unknown = currentState;
    let parentIsRoot = true;

    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      if (segment === undefined || parent === null || typeof parent !== 'object') {
        parent = undefined;
        break;
      }

      let currentVal = isMap(parent)
        ? parent.get(segment)
        : (parent as Record<string | number, unknown>)[segment];

      if (
        typeof currentVal === 'object' &&
        currentVal !== null &&
        isDraftable(currentVal) &&
        !copies.has(currentVal)
      ) {
        const originalParent = parent;
        parent = ensureMutable(parent as object);
        if (parentIsRoot && parent !== originalParent) {
          currentState = parent as T;
        }
        currentVal = isMap(parent)
          ? parent.get(segment)
          : (parent as Record<string | number, unknown>)[segment];
        const mutableChild = ensureMutable(currentVal as object);
        if (isMap(parent)) {
          parent.set(segment, mutableChild);
        } else if (typeof segment === 'string' || typeof segment === 'number') {
          (parent as Record<string | number, unknown>)[segment] = mutableChild;
        }
      }
      // Navigate to the next level (handle potential undefined if path is wrong)
      parent = isMap(parent)
        ? parent.get(segment)
        : (parent as Record<string | number, unknown>)?.[segment];
      parentIsRoot = false;
    }

    if (parent === undefined || parent === null || typeof parent !== 'object') {
      continue; // Skip patch if parent is invalid
    }

    // Ensure the final parent is mutable before applying the operation
    const mutableParent = ensureMutable(parent as object);
    if (parentIsRoot && mutableParent !== currentState) {
      currentState = mutableParent as T;
    }

    const targetSegment = path[path.length - 1];

    if (targetSegment === undefined) {
      // Check specifically for undefined segment
      continue;
    }

    switch (patch.op) {
      case 'add':
      case 'replace': {
        let valueToApply = patch.value;

        if (patch.op === 'replace') {
          let currentValueAtPath: unknown;
          if (isMap(mutableParent)) {
            currentValueAtPath = mutableParent.get(targetSegment);
          } else if (typeof mutableParent === 'object') {
            // Use type assertion after checks
            currentValueAtPath = (mutableParent as Record<string | number, unknown>)[targetSegment];
          } else {
            currentValueAtPath = undefined;
          }

          if (isSet(currentValueAtPath) && Array.isArray(valueToApply)) {
            valueToApply = new Set(valueToApply);
          }
        }

        if (Array.isArray(mutableParent) && targetSegment === '-') {
          if (patch.op === 'add') {
            mutableParent.push(valueToApply);
          } else {
            mutableParent.push(valueToApply);
          }
        } else if (Array.isArray(mutableParent) && typeof targetSegment === 'number') {
          if (patch.op === 'add') {
            mutableParent.splice(targetSegment, 0, valueToApply);
          } else {
            // replace
            if (targetSegment < mutableParent.length) {
              mutableParent[targetSegment] = valueToApply;
            } else {
            }
          }
        } else if (isMap(mutableParent)) {
          mutableParent.set(targetSegment, valueToApply);
        } else if (typeof mutableParent === 'object') {
          // Use type assertion after checks
          (mutableParent as Record<string | number, unknown>)[targetSegment] = valueToApply;
        } else {
        }
        break;
      }
      case 'remove':
        if (Array.isArray(mutableParent) && typeof targetSegment === 'number') {
          if (targetSegment < mutableParent.length) {
            mutableParent.splice(targetSegment, 1);
          } else {
          }
        } else if (isMap(mutableParent)) {
          mutableParent.delete(targetSegment);
        } else if (isSet(mutableParent)) {
          mutableParent.delete(targetSegment); // Attempt delete anyway
        } else if (typeof mutableParent === 'object') {
          // Use type assertion after checks
          delete (mutableParent as Record<string | number, unknown>)[targetSegment];
        } else {
        }
        break;
      case 'move': {
        if (!patch.from || !patch.path) {
          throw new Error(`'move' requires 'from' and 'path'.`);
        }
        if (patch.from.join('/') === patch.path.join('/')) break;

        const valueToMove = getValueByPath(currentState, patch.from);

        // Check source path existence
        let fromParentCheck: unknown = currentState;
        let sourceExists = true;
        for (let i = 0; i < patch.from.length; i++) {
          const seg = patch.from[i];
          if (
            fromParentCheck === null ||
            typeof fromParentCheck !== 'object' ||
            seg === undefined
          ) {
            sourceExists = false;
            break;
          }
          if (isMap(fromParentCheck)) {
            if (!fromParentCheck.has(seg)) {
              sourceExists = false;
              break;
            }
            if (i < patch.from.length - 1) fromParentCheck = fromParentCheck.get(seg);
          } else if (isSet(fromParentCheck)) {
            sourceExists = false;
            break;
          }
          // Use type assertion after checks for object indexing
          else if (!(seg in fromParentCheck)) {
            sourceExists = false;
            break;
          } else {
            if (i < patch.from.length - 1)
              fromParentCheck = (fromParentCheck as Record<string | number, unknown>)[seg];
          }
        }
        if (!sourceExists) {
          throw new Error(`'move' operation source path does not exist: ${patch.from.join('/')}`);
        }

        // Apply remove op first (recursively for CoW safety)
        const stateAfterRemove = applyPatches(currentState, [{ op: 'remove', path: patch.from }]);
        // Now apply add op with the moved value
        currentState = applyPatches(stateAfterRemove, [
          { op: 'add', path: patch.path, value: valueToMove },
        ]);
        break;
      }
      case 'copy': {
        if (!patch.from || !patch.path) {
          throw new Error(`'copy' requires 'from' and 'path'.`);
        }
        const valueToCopy = getValueByPath(currentState, patch.from);

        // Check source path existence
        let existsCheck: unknown = currentState;
        let sourceExists = true;
        for (let i = 0; i < patch.from.length; i++) {
          const seg = patch.from[i];
          if (existsCheck === null || typeof existsCheck !== 'object' || seg === undefined) {
            sourceExists = false;
            break;
          }
          if (isMap(existsCheck)) {
            if (!existsCheck.has(seg)) {
              sourceExists = false;
              break;
            }
            if (i < patch.from.length - 1) existsCheck = existsCheck.get(seg);
          } else if (isSet(existsCheck)) {
            sourceExists = false;
            break;
          }
          // Use type assertion after checks for object indexing
          else if (!(seg in existsCheck)) {
            sourceExists = false;
            break;
          } else {
            if (i < patch.from.length - 1)
              existsCheck = (existsCheck as Record<string | number, unknown>)[seg];
          }
        }
        if (!sourceExists) {
          throw new Error(`'copy' operation source path does not exist: ${patch.from.join('/')}`);
        }

        const clonedValue = structuredClone(valueToCopy); // Deep clone

        // Apply add op (recursively for CoW safety)
        currentState = applyPatches(currentState, [
          { op: 'add', path: patch.path, value: clonedValue },
        ]);
        break;
      }
      case 'test': {
        const currentValue = getValueByPath(currentState, patch.path);
        // Use JSON stringify for simple deep comparison. Limitations apply.
        const valuesAreEqual = JSON.stringify(currentValue) === JSON.stringify(patch.value);
        if (!valuesAreEqual) {
          throw new Error(`'test' operation failed at path: ${patch.path.join('/')}`);
        }
        break;
      }
      default:
        // Handle custom Set operations explicitly
        if (patch.op === 'set_add') {
          if (isSet(mutableParent)) {
            mutableParent.add(patch.value);
          } else {
          }
        } else if (patch.op === 'set_delete') {
          if (isSet(mutableParent)) {
            mutableParent.delete(patch.value);
          } else {
          }
        } else {
          // Only log warning if it's not one of the handled standard ops either
          if (!['add', 'replace', 'remove', 'move', 'copy', 'test'].includes(patch.op)) {
          }
        }
    }
  }

  // Auto-freeze logic moved back to produce function

  return currentState as T;
}

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
