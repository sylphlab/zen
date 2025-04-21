import { isDraftable, isMap, isSet } from './utils'; // Assuming utils.ts will be created
import { deepFreeze } from './utils'; // Assuming utils.ts will contain deepFreeze
import type { Patch, ProduceOptions, ProduceResult } from './types';

// The core produce function
export function produce<T, R = T>( // Add generic R for return type, defaults to T
  baseState: T,
  recipe: (draft: T) => R | undefined, // Recipe can return R or undefined
  options?: ProduceOptions,
): ProduceResult<R> { // Return type uses R
  if (!isDraftable(baseState)) {
    const result = recipe(baseState as T); // Try calling recipe directly
    const finalState: R | T = result === undefined ? baseState : result; // finalState can be R or T
    // Auto-freeze non-draftable results if requested (won't be recursive)
    if (
      options?.autoFreeze &&
      finalState !== baseState &&
      typeof finalState === 'object' &&
      finalState !== null
    ) {
      Object.freeze(finalState);
    }
    return [finalState as R, [], []]; // Assert finalState as R for return
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
        // If generating inverse patches, store originals before copy (if not already stored)
        if (generateInversePatches && !originalValues.has(copy) && originalValues.has(base)) {
           const baseOriginals = originalValues.get(base); // Remove !
           if (baseOriginals) { // Add check
              originalValues.set(copy, new Map(baseOriginals));
           }
        }
        return copy;
      }
      const copy = copies.get(base); // Remove !
      if (!copy) {
         // This case should logically not be hit if copies.has(base) is true,
         // but we need to satisfy TS/Biome. Returning original base is safest fallback.
         return base;
      }
      return copy;
    };

    return {
      get(_target, prop, receiver) {
        const currentTarget = copies.get(base) ?? base;

        // --- Intercept Map/Set/Array methods ---
        if (isMap(currentTarget) && mapMutatingMethods[prop as keyof MapMutatingMethods]) {
          ensureMutableCopy();
          const method = prop as keyof MapMutatingMethods;
          return (...args: unknown[]) => {
            const copy = copies.get(base) as Map<unknown, unknown>;
            if (!copy) return; // Check added
            const key = args[0];
            const hasOldValue = copy.has(key);
            const oldValue = hasOldValue ? copy.get(key) : undefined;
            if (generateInversePatches) {
              if (!originalValues.has(copy)) originalValues.set(copy, new Map());
              const copyOriginals = originalValues.get(copy);
              if (!copyOriginals) return; // Check added
              const mapKey: string | symbol = typeof key === 'symbol' ? key : String(key);
              if (!copyOriginals.has(mapKey)) { copyOriginals.set(mapKey, oldValue); }
            }
            let result: unknown;
            if (method === 'clear') {
              if (generatePatches && copy.size > 0) {
                const oldMapContent = generateInversePatches ? new Map(copy) : undefined;
                for (const k of Array.from(copy.keys())) {
                  const currentPath = [...path, k as string | number];
                  patches.push({ op: 'remove', path: currentPath });
                  if (generateInversePatches && oldMapContent) {
                    const originalVal = oldMapContent.get(k);
                    inversePatches.push({ op: 'add', path: currentPath, value: originalVal });
                  }
                }
                if (generateInversePatches) inversePatches.reverse();
              }
              result = copy.clear();
            } else {
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
                  inversePatches.push({ op: inverseOp, path: currentPath, value: op === 'add' ? undefined : originalVal });
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
        if (isSet(currentTarget) && setMutatingMethods[prop as keyof SetMutatingMethods]) {
           ensureMutableCopy();
           const method = prop as keyof SetMutatingMethods;
           return (...args: unknown[]) => {
             const copy = copies.get(base) as Set<unknown>;
             if (!copy) return; // Check added
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
             } else { result = undefined; }
             if (generatePatches) {
               const currentPath = [...path];
               if (method === 'add' && valueWasAdded) {
                 patches.push({ op: 'set_add', path: currentPath, value });
                 if (generateInversePatches) { inversePatches.push({ op: 'set_delete', path: currentPath, value }); }
               } else if (method === 'delete' && valueWasDeleted) {
                 patches.push({ op: 'set_delete', path: currentPath, value });
                 if (generateInversePatches) { inversePatches.push({ op: 'set_add', path: currentPath, value }); }
               } else if (method === 'clear') {
                 if (originalSetAsArray && originalSetAsArray.length > 0) {
                   patches.push({ op: 'replace', path: currentPath, value: [] });
                   if (generateInversePatches) { inversePatches.push({ op: 'replace', path: currentPath, value: originalSetAsArray }); }
                 }
               }
             }
             return result;
           };
        }
        if (Array.isArray(currentTarget) && arrayMutatingMethods[prop as keyof ArrayMutatingMethods]) {
           ensureMutableCopy();
           const method = prop as keyof ArrayMutatingMethods;
           return (...args: unknown[]) => {
             const copy = copies.get(base) as unknown[];
             if (!copy) return; // Check added
             const originalLength = copy.length;
             let removedElements: unknown[] | undefined;
             if (generateInversePatches) {
               if (method === 'splice') { removedElements = copy.slice(args[0] as number, (args[0] as number) + ((args[1] as number) ?? 0)); }
               else if (method === 'pop') { removedElements = copy.length > 0 ? [copy[copy.length - 1]] : []; }
               else if (method === 'shift') { removedElements = copy.length > 0 ? [copy[0]] : []; }
             }
             let result: unknown;
             if (method === 'sort') {
               const originalArray = generateInversePatches ? [...copy] : undefined;
               const compareFn = args[0] as ((a: unknown, b: unknown) => number) | undefined;
               result = copy.sort(compareFn);
               if (generatePatches) {
                 patches.push({ op: 'replace', path: [...path], value: [...copy] });
                 if (generateInversePatches && originalArray) { inversePatches.push({ op: 'replace', path: [...path], value: originalArray }); }
               }
             } else if (method === 'reverse') {
               const originalArray = generateInversePatches ? [...copy] : undefined;
               result = copy.reverse();
               if (generatePatches) {
                 patches.push({ op: 'replace', path: [...path], value: [...copy] });
                 if (generateInversePatches && originalArray) { inversePatches.push({ op: 'replace', path: [...path], value: originalArray }); }
               }
             } else {
               switch (method) {
                 case 'push': result = copy.push(...args); break;
                 case 'pop': result = copy.pop(); break;
                 case 'shift': result = copy.shift(); break;
                 case 'unshift': result = copy.unshift(...args); break;
                 case 'splice': result = copy.splice(args[0] as number, (args[1] as number) ?? undefined, ...args.slice(2)); break;
                 default: result = undefined;
               }
               const newLength = copy.length;
               if (generatePatches) {
                 switch (method) {
                   case 'push':
                     for (let i = originalLength; i < newLength; i++) {
                       patches.push({ op: 'add', path: [...path, i], value: copy[i] });
                       if (generateInversePatches) { inversePatches.push({ op: 'remove', path: [...path, i] }); }
                     } break;
                   case 'pop':
                     if (originalLength > 0) {
                       patches.push({ op: 'remove', path: [...path, originalLength - 1] });
                       if (generateInversePatches && removedElements) { inversePatches.push({ op: 'add', path: [...path, originalLength - 1], value: removedElements[0] }); }
                     } break;
                   case 'shift':
                     if (originalLength > 0) {
                       patches.push({ op: 'remove', path: [...path, 0] });
                       if (generateInversePatches && removedElements) { inversePatches.push({ op: 'add', path: [...path, 0], value: removedElements[0] }); }
                     } break;
                   case 'unshift':
                     for (let i = 0; i < args.length; i++) {
                       patches.push({ op: 'add', path: [...path, i], value: copy[i] });
                       if (generateInversePatches) { inversePatches.push({ op: 'remove', path: [...path, i] }); }
                     } break;
                   case 'splice': {
                     const startIndex = args[0] as number;
                     const deleteCount = (args[1] as number) ?? 0;
                     const itemsToAdd = args.slice(2);
                     for (let i = 0; i < deleteCount; i++) {
                       const removeIndex = startIndex; // Index stays same as elements are removed
                       patches.push({ op: 'remove', path: [...path, removeIndex] });
                       if (generateInversePatches && removedElements) { inversePatches.push({ op: 'add', path: [...path, startIndex + i], value: removedElements[i] }); }
                     }
                     for (let i = 0; i < itemsToAdd.length; i++) {
                       const addIndex = startIndex + i;
                       patches.push({ op: 'add', path: [...path, addIndex], value: itemsToAdd[i] });
                       if (generateInversePatches) { inversePatches.push({ op: 'remove', path: [...path, addIndex] }); }
                     }
                     if (generateInversePatches) inversePatches.reverse(); // Apply inverse splice adds before removes
                     break;
                   }
                 }
               }
             }
             return result;
           };
        }

        // --- Corrected CoW Get Logic ---
        const value = Reflect.get(currentTarget, prop, receiver);

        // Handle non-draftable properties or symbols directly
        if (typeof prop === 'symbol' || !isDraftable(value)) {
          return value;
        }

        // Return cached proxy if available
        if (proxyCache.has(value)) {
          return proxyCache.get(value);
        }

        // Ensure parent is mutable *before* creating nested proxy
        const parentCopy = ensureMutableCopy(); // This is 'base's copy
        // Get the potentially updated child value *from the parent's copy*
        const valueFromCopy = Reflect.get(parentCopy, prop, receiver);

        // If the child itself isn't draftable after potential copy, return it
        if (!isDraftable(valueFromCopy)) {
           return valueFromCopy;
        }

        // Create and cache the nested proxy
        const newPath = [...path, prop as string | number];
        const nestedProxy = new Proxy(
          valueFromCopy as object, // Proxy the value *from the copy*
          createProxyHandler(value as object, newPath) // Handler still tracks the *original* value for CoW lookups
        );
        proxyCache.set(value as object, nestedProxy); // Cache against original value identity
        // Also cache against the copied value identity if it differs (e.g., array spread)
        if (valueFromCopy !== value) {
           proxyCache.set(valueFromCopy as object, nestedProxy);
        }
        return nestedProxy;
      }, // End get

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
          const copyOriginals = originalValues.get(copy);
          if (!copyOriginals) return true; // Check added
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
      }, // End set

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
          const copyOriginals = originalValues.get(copy);
          if (!copyOriginals) return true; // Check added
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
      } // End deleteProperty
    }; // End ProxyHandler return object
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
  let finalState: R | T = baseState; // finalState can be R or T initially

  if (recipeResult !== undefined) {
    // If recipe returns a value, it overrides everything
    finalState = recipeResult;
    // Immer doesn't generate patches when a value is returned. Mimic this.
    patches.length = 0;
    inversePatches.length = 0;
  } else if (copies.size > 0) { // If any copies were made anywhere...
    // ...return the (potentially copied) root object. ensureMutableCopy should have handled creating the root copy if needed.
    finalState = (copies.get(baseState as object) as T ?? baseState);
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

  return [finalState as R, patches, inversePatches]; // Assert finalState as R for return
}