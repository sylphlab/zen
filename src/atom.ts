// 极致优化的轻量级状态管理库 (怪兽性能版) - 基本 Atom 实现

import {
  Atom,
  Listener,
  Unsubscribe,
  // EMPTY_SET, // Removed
  batchDepth,
  batchQueue,
  // EventPayload, // Removed
  // SetPayload, // Removed
  // NotifyPayload, // Removed
  // PathString, // Removed
  // KeyListener // Removed
} from './core';
// Import checkPaths helper - REMOVED
// import { checkPaths } from './keys';

// Helper function to trigger event listeners (Exported) - REMOVED
// REMOVED: AtomProto definition

/**
 * Creates a minimal, highly optimized atom using a factory function.
 */
export function atom<T>(initialValue: T): Atom<T> {
  let _value: T = initialValue;
  let _listeners: Set<Listener<T>> | undefined = undefined;

  // --- Define methods in a shared object within the closure ---
  const methods = {
    get(): T {
      return _value;
    },
    set(newValue: T, forceNotify: boolean = false): void {
      const oldValue = _value;
      if (forceNotify || !Object.is(newValue, oldValue)) {
        _value = newValue;
        // REMOVED: const self = atomInstance; (Unnecessary capture here)
        if (batchDepth > 0) {
          // Pass 'atomInstance' (which will be created below) to batchQueue
          if (!batchQueue.has(atomInstance)) {
             batchQueue.add(atomInstance);
          }
        } else {
          methods._notify(newValue, oldValue); // Call method via object
        }
      }
    },
    subscribe(listener: Listener<T>): Unsubscribe {
      (_listeners = _listeners || new Set()).add(listener);
      listener(_value, undefined);
      return (): void => {
        if (_listeners) {
          _listeners.delete(listener);
        }
      };
    },
    _notify(value: T, oldValue?: T): void {
      if (_listeners && _listeners.size > 0) {
        for (const listener of _listeners) {
          listener(value, oldValue);
        }
      }
    },
    _notifyBatch(): void {
      methods._notify(_value, undefined); // Call method via object
    }
  };
  // --- End method definitions ---


  // Define _notify function within closure - REMOVED (now in methods)
  /*const _notify = (value: T, oldValue?: T): void => {
    if (_listeners && _listeners.size > 0) {
      for (const listener of _listeners) {
        listener(value, oldValue);
      }
    }
  };

  // Define _notifyBatch function within closure - REMOVED (now in methods)
  /*const _notifyBatch = (): void => {
    _notify(_value, undefined); // Use current _value
  };*/

  // Create the atom object using the methods object
  const atomInstance: Atom<T> = {
    // Spread methods
    ...methods,
    // Add getters for internal state required by interface
    get _value() { return _value; },
    get _listeners() { return _listeners; },
    // _batchValue is defined in core.ts interface, used temporarily by batch logic
    // It's not explicitly initialized here, relying on the interface definition
  };

  return atomInstance;
}
