// Ultra-optimized events system - Monster Edition
import { Atom, ReadonlyAtom } from './core';
import { STORE_MAP_KEY_SET } from './keys';
import { Path, PathArray, getDeep } from './deepMapInternal';

// Lifecycle events with symbols
export const LIFECYCLE = {
  onStart: Symbol('s'),
  onStop: Symbol('e'),
  onSet: Symbol('t'),
  onNotify: Symbol('n'),
  onMount: Symbol('m')
};

export type LifecycleEvent = typeof LIFECYCLE[keyof typeof LIFECYCLE];
export type LifecycleListener<T = any> = (value?: T) => void;

// Add lifecycle listener
export function listen<T>(
  a: Atom<T> | ReadonlyAtom<T>,
  e: LifecycleEvent,
  fn: LifecycleListener<T>
): () => void {
  const ls = a[e] || new Set();
  a[e] = ls;
  ls.add(fn);
  
  // Emit onMount immediately with undefined parameter
  if (e === LIFECYCLE.onMount) fn(undefined);
  
  return () => {
    ls.delete(fn);
    if (!ls.size) delete a[e];
  };
}

// Emit lifecycle event
export function emit<T>(
  a: Atom<T> | ReadonlyAtom<T> | undefined,
  e: LifecycleEvent,
  v?: T
): void {
  const ls = a?.[e] as Set<LifecycleListener<T>> | undefined;
  if (!ls?.size) return;
  
  if (ls.size === 1) {
    ls.values().next().value?.(v);
    return;
  }
  
  for (const fn of ls) fn?.(v);
}

// Path & Key subscription types
export type PathListener<T> = (value: any, path: Path, obj: T) => void;
export type KeyListener<T, K extends keyof T = keyof T> = (value: T[K] | undefined, key: K, obj: T) => void;

// Registries
const pathListeners = new WeakMap<Atom<any>, Map<string, Set<PathListener<any>>>>();
const keyListeners = new WeakMap<Atom<any>, Map<any, Set<KeyListener<any>>>>();

// Listen for deep path changes
export function baseListenPaths<T extends object>(
  a: Atom<T> & { [STORE_MAP_KEY_SET]?: boolean },
  paths: Path[],
  fn: PathListener<T>
): () => void {
  if (!a[STORE_MAP_KEY_SET]) return () => {};
  
  let aListeners = pathListeners.get(a);
  if (!aListeners) {
    aListeners = new Map();
    pathListeners.set(a, aListeners);
  }
  
  const pathStrs = paths.map(p => Array.isArray(p) ? p.join('\0') : String(p));
  
  pathStrs.forEach(ps => {
    let fns = aListeners!.get(ps);
    if (!fns) {
      fns = new Set();
      aListeners!.set(ps, fns);
    }
    fns.add(fn as PathListener<any>);
  });
  
  return () => {
    const ls = pathListeners.get(a);
    if (!ls) return;
    
    pathStrs.forEach(ps => {
      const fns = ls.get(ps);
      if (fns) {
        fns.delete(fn as PathListener<any>);
        if (!fns.size) ls.delete(ps);
      }
    });
    
    if (!ls.size) pathListeners.delete(a);
  };
}

// Fixed emitPaths to preserve array path format for listeners
export function emitPaths<T extends object>(
  a: Atom<T>,
  changedPaths: Path[],
  finalValue: T
): void {
  const ls = pathListeners.get(a);
  if (!ls?.size || !changedPaths.length) return;
  
  // Map paths to normalized form for faster processing
  const normalized = new Map<string, {path: Path, array: PathArray}>();
  changedPaths.forEach(p => {
    const array = Array.isArray(p) ? p : String(p).split('.');
    const key = array.join('\0');
    normalized.set(key, {path: p, array});
  });
  
  // Process each listener registration
  ls.forEach((listeners, regPathStr) => {
    const regPathArray = regPathStr.split('\0');
    const regPathLen = regPathArray.length;
    
    // Check each changed path against this registration
    for (const [changedPathStr, {path, array}] of normalized.entries()) {
      // Check if this registration is a prefix of the changed path
      let isPrefix = true;
      if (regPathLen > array.length) {
        isPrefix = false;
      } else {
        for (let i = 0; i < regPathLen; i++) {
          if (regPathArray[i] !== String(array[i])) {
            isPrefix = false;
            break;
          }
        }
      }
      
      if (isPrefix) {
        // This registration matches this change, notify all listeners
        const value = getDeep(finalValue, array);
        
        listeners.forEach(listener => {
          try {
            // CRITICAL FIX: We must preserve the original path format from changedPaths
            // For array paths, pass the original array path, not a string
            listener(value, path, finalValue);
          } catch (err) {
            console.error('Error in path listener:', err);
          }
        });
      }
    }
  });
}

// Listen for key changes
export function listenKeys<T extends object, K extends keyof T>(
  a: Atom<T> & { [STORE_MAP_KEY_SET]?: boolean },
  keys: K[],
  fn: KeyListener<T, K>
): () => void {
  if (!a[STORE_MAP_KEY_SET]) return () => {};
  
  let aListeners = keyListeners.get(a);
  if (!aListeners) {
    aListeners = new Map();
    keyListeners.set(a, aListeners);
  }
  
  keys.forEach(k => {
    let fns = aListeners!.get(k);
    if (!fns) {
      fns = new Set();
      aListeners!.set(k, fns);
    }
    fns.add(fn as KeyListener<any>);
  });
  
  return () => {
    const ls = keyListeners.get(a);
    if (!ls) return;
    
    keys.forEach(k => {
      const fns = ls.get(k);
      if (fns) {
        fns.delete(fn as KeyListener<any>);
        if (!fns.size) ls.delete(k);
      }
    });
    
    if (!ls.size) keyListeners.delete(a);
  };
}

// Emit key changes
export function emitKeys<T extends object>(
  a: Atom<T>,
  keys: ReadonlyArray<keyof T>,
  val: T
): void {
  const ls = keyListeners.get(a);
  if (!ls?.size) return;
  
  // For each changed key, find and call all listeners for that key
  keys.forEach(k => {
    const listeners = ls.get(k);
    if (listeners?.size) {
      const v = val[k];
      listeners.forEach(fn => fn?.(v, k as any, val));
    }
  });
}
