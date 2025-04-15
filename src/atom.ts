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

  // Define _notify function within closure
  const _notify = (value: T, oldValue?: T): void => {
    if (_listeners && _listeners.size > 0) {
      for (const listener of _listeners) {
        listener(value, oldValue);
      }
    }
  };

  // Define _notifyBatch function within closure
  const _notifyBatch = (): void => {
    _notify(_value, undefined); // Use current _value
  };

  // Create the atom object directly
  const atomInstance: Atom<T> = {
    // Use internal variable _value directly
    get _value() {
       return _value;
    },
    // Expose internal listeners (needed by computed potentially, keep for now)
    get _listeners() {
        return _listeners;
    },
    // Define methods within closure
    get(): T {
      return _value;
    },
    set(newValue: T, forceNotify: boolean = false): void {
      const oldValue = _value;
      if (forceNotify || !Object.is(newValue, oldValue)) {
        _value = newValue; // Update closure variable

        const self = atomInstance; // Capture instance for batchQueue
        if (batchDepth > 0) {
          if (!batchQueue.has(self)) {
            batchQueue.add(self);
          }
        } else {
          _notify(newValue, oldValue);
        }
      }
    },
    subscribe(listener: Listener<T>): Unsubscribe {
      // Optimized listener set initialization using closure variable
      (_listeners = _listeners || new Set()).add(listener);
      listener(_value, undefined); // Notify immediately

      // Unsubscribe closure
      return (): void => {
        if (_listeners) {
          _listeners.delete(listener);
        }
      };
    },
    // Assign internal methods
    _notify,
    _notifyBatch,
    // _batchValue is defined in core.ts interface, used temporarily by batch logic
    // It's not explicitly initialized here, relying on the interface definition
  };

  return atomInstance;
}
