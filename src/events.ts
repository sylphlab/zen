// Ultra-optimized events system - Refactored for Tree-shaking (v5 - Patching - Batch Fix)
import { Atom, ReadonlyAtom, Listener, Unsubscribe, AtomProto as CoreAtomProto } from './core';
import { isInBatch } from './batch'; // Import isInBatch
import { STORE_MAP_KEY_SET } from './keys';
import { Path, PathArray, getDeep } from './deepMapInternal';

// --- Types ---
export type LifecycleListener<T = any> = (value?: T) => void;
export type PathListener<T> = (value: any, path: Path, obj: T) => void;
export type KeyListener<T, K extends keyof T = keyof T> = (value: T[K] | undefined, key: K, obj: T) => void;

// --- Patching Logic ---

// Store original methods from CORE prototype (fallback)
const coreOriginalSet = CoreAtomProto.set;
const coreOriginalSubscribe = CoreAtomProto.subscribe;
const coreOriginalNotify = CoreAtomProto._notify;

// Type guard to check if an atom is mutable
function isMutableAtom<T>(a: Atom<T> | ReadonlyAtom<T>): a is Atom<T> {
  // Check for presence of 'set' function AND absence of '_sources' (indicating it's not a computed store)
  return typeof (a as Atom<T>).set === 'function' && !('_sources' in a);
}

function ensurePatched<T>(a: Atom<T> | ReadonlyAtom<T>) {
  if (a._patchedForEvents) return;

  // --- Patch only MUTABLE atoms ---
  if (isMutableAtom(a)) {
    const instanceOriginalSet = a.set; // Capture instance's original set (could be core or already patched)
    // Patch set method
    a.set = function(this: Atom<T>, v: T, force = false) {
      const old = this._value;
      if (force || !Object.is(v, old)) {
        if (!isInBatch()) {
            // --- Outside batch ---
            // Trigger onSet listeners BEFORE setting value
            (this._setListeners as Set<LifecycleListener<T>> | undefined)?.forEach((fn: LifecycleListener<T>) => { try { fn(v); } catch(e) { console.error(e); } });
            // Call INSTANCE'S original set logic (which includes notification)
            instanceOriginalSet.call(this, v, force);
        } else {
            // --- Inside batch ---
            // Call the method currently on the prototype (which should be batch.patchedSet)
            // This ensures batching logic takes over completely, preventing event notifications.
            CoreAtomProto.set.call(this, v, force);
        }
      }
    };
  }
  // --- End of mutable atom patching ---

  // --- Patch methods common to Atom and ReadonlyAtom ---

  const instanceOriginalNotify = a._notify; // Capture instance's original _notify
  // Patch _notify method (applies to both)
  a._notify = function(this: Atom<T> | ReadonlyAtom<T>, v: T, old?: T) {
    // Call INSTANCE'S original notify logic FIRST
    instanceOriginalNotify.call(this, v, old);
    // Trigger onNotify listeners AFTER value listeners
    (this._notifyListeners as Set<LifecycleListener<T>> | undefined)?.forEach((fn: LifecycleListener<T>) => { try { fn(v); } catch(e) { console.error(e); } });
  };

  const instanceOriginalSubscribe = a.subscribe; // Capture instance's original subscribe
  // Patch subscribe method (applies to both)
  a.subscribe = function(this: Atom<T> | ReadonlyAtom<T>, fn: Listener<T>): Unsubscribe {
    const first = !this._listeners || this._listeners.size === 0;
    const unsub = instanceOriginalSubscribe.call(this, fn); // Call INSTANCE'S original subscribe logic FIRST

    if (first) { // Trigger onStart listeners if it's the first subscriber
      (this._startListeners as Set<LifecycleListener<T>> | undefined)?.forEach((l: LifecycleListener<T>) => { try { l(undefined); } catch(e) { console.error(e); } });
    }
    // onMount is handled by onMount function itself

    const self = this;
    return () => { // Return a patched unsubscribe function
      unsub(); // Call original unsubscribe
      if (!self._listeners || self._listeners.size === 0) { // Trigger onStop listeners if it's the last subscriber
        (self._stopListeners as Set<LifecycleListener<T>> | undefined)?.forEach((l: LifecycleListener<T>) => { try { l(undefined); } catch(e) { console.error(e); } });
      }
      };
    };
  // --- End of common patching ---

  a._patchedForEvents = true;
}


// --- Internal Helper for Removing Listeners ---
function _unsubscribe<T>(
  a: Atom<T> | ReadonlyAtom<T>,
  listenerSetProp: '_startListeners' | '_stopListeners' | '_setListeners' | '_notifyListeners' | '_mountListeners',
  fn: LifecycleListener<T>
): void {
  const ls = a[listenerSetProp];
  if (ls) {
    ls.delete(fn);
    if (!ls.size) delete a[listenerSetProp];
  }
}

// --- Exported Lifecycle Listener Functions (Patch atom on first use) ---

export function onStart<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): () => void {
  ensurePatched(a);
  if (!a._startListeners) a._startListeners = new Set();
  a._startListeners.add(fn);
  return () => _unsubscribe(a, '_startListeners', fn);
}

export function onStop<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): () => void {
  ensurePatched(a);
  if (!a._stopListeners) a._stopListeners = new Set();
  a._stopListeners.add(fn);
  return () => _unsubscribe(a, '_stopListeners', fn);
}

export function onSet<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): () => void {
  // Ensure the atom is mutable before allowing onSet
  if (!isMutableAtom(a)) {
    throw new Error('onSet can only be used with mutable atoms (atom, map, deepMap)');
  }
  ensurePatched(a);
  if (!a._setListeners) a._setListeners = new Set();
  a._setListeners.add(fn);
  return () => _unsubscribe(a, '_setListeners', fn);
}

export function onNotify<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): () => void {
  ensurePatched(a);
  if (!a._notifyListeners) a._notifyListeners = new Set();
  a._notifyListeners.add(fn);
  return () => _unsubscribe(a, '_notifyListeners', fn);
}

export function onMount<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): () => void {
  ensurePatched(a);
  if (!a._mountListeners) a._mountListeners = new Set();
  a._mountListeners.add(fn);
  try { fn(undefined); } catch (err) { console.error(err); } // Call immediately
  return () => _unsubscribe(a, '_mountListeners', fn);
}


// --- Key/Path Listeners ---

const pathListeners = new WeakMap<Atom<any>, Map<string, Set<PathListener<any>>>>();
const keyListeners = new WeakMap<Atom<any>, Map<any, Set<KeyListener<any>>>>();

export function listenPaths<T extends object>(
  a: Atom<T> & { [STORE_MAP_KEY_SET]?: boolean },
  paths: Path[],
  fn: PathListener<T>
): () => void {
  if (!a[STORE_MAP_KEY_SET]) return () => {};
  let aListeners = pathListeners.get(a);
  if (!aListeners) { aListeners = new Map(); pathListeners.set(a, aListeners); }
  const pathStrs = paths.map(p => Array.isArray(p) ? p.join('\0') : String(p));
  pathStrs.forEach(ps => {
    let fns = aListeners!.get(ps);
    if (!fns) { fns = new Set(); aListeners!.set(ps, fns); }
    fns.add(fn as PathListener<any>);
  });
  return () => {
    const ls = pathListeners.get(a); if (!ls) return;
    pathStrs.forEach(ps => {
      const fns = ls.get(ps);
      if (fns) { fns.delete(fn as PathListener<any>); if (!fns.size) ls.delete(ps); }
    });
    if (!ls.size) pathListeners.delete(a);
  };
}

export function _emitPathChanges<T extends object>(
  a: Atom<T>, changedPaths: Path[], finalValue: T
): void {
  const ls = pathListeners.get(a); if (!ls?.size || !changedPaths.length) return;
  const normalized = new Map<string, {path: Path, array: PathArray}>();
  changedPaths.forEach(p => {
    const array = Array.isArray(p) ? p : String(p).split('.');
    normalized.set(array.join('\0'), {path: p, array});
  });
  ls.forEach((listeners, regPathStr) => {
    const regPathArray = regPathStr.split('\0'); const regPathLen = regPathArray.length;
    for (const [ , {path, array}] of normalized.entries()) {
      let isPrefix = regPathLen <= array.length;
      if (isPrefix) {
        for (let i = 0; i < regPathLen; i++) {
          if (regPathArray[i] !== String(array[i])) { isPrefix = false; break; }
        }
      }
      if (isPrefix) {
        const value = getDeep(finalValue, array);
        listeners.forEach(listener => { try { listener(value, path, finalValue); } catch (err) { console.error(err); } });
      }
    }
  });
}

export function listenKeys<T extends object, K extends keyof T>(
  a: Atom<T> & { [STORE_MAP_KEY_SET]?: boolean }, keys: K[], fn: KeyListener<T, K>
): () => void {
  if (!a[STORE_MAP_KEY_SET]) return () => {};
  let aListeners = keyListeners.get(a);
  if (!aListeners) { aListeners = new Map(); keyListeners.set(a, aListeners); }
  keys.forEach(k => {
    let fns = aListeners!.get(k);
    if (!fns) { fns = new Set(); aListeners!.set(k, fns); }
    fns.add(fn as KeyListener<any>);
  });
  return () => {
    const ls = keyListeners.get(a); if (!ls) return;
    keys.forEach(k => {
      const fns = ls.get(k);
      if (fns) { fns.delete(fn as KeyListener<any>); if (!fns.size) ls.delete(k); }
    });
    if (!ls.size) keyListeners.delete(a);
  };
}

export function _emitKeyChanges<T extends object>(
  a: Atom<T>, keys: ReadonlyArray<keyof T>, val: T
): void {
  const ls = keyListeners.get(a); if (!ls?.size) return;
  keys.forEach(k => {
    const listeners = ls.get(k);
    if (listeners?.size) {
      const v = val[k];
      if (listeners.size === 1) {
        try { listeners.values().next().value?.(v, k as any, val); } catch (err) { console.error(err); }
      } else {
        listeners.forEach(fn => { try { fn?.(v, k as any, val); } catch (err) { console.error(err); } });
      }
    }
  });
}
