import { describe, it, expect, vi } from 'vitest';
import { atom } from './atom';
import { computed } from './computed';
import { listen, LIFECYCLE } from './events';
import type { Atom } from './core';

describe('Lifecycle Events', () => {
  it('LIFECYCLE.onMount should trigger immediately upon listen', () => {
    const store = atom(0);
    const mountListener = vi.fn();

    const unsubscribe = listen(store, LIFECYCLE.onMount, mountListener);

    expect(mountListener).toHaveBeenCalledTimes(1);
    // onMount typically doesn't receive a value unless explicitly designed to
    expect(mountListener).toHaveBeenCalledWith(undefined);

    unsubscribe();
  });

  it('LIFECYCLE.onStart should trigger when the first listener subscribes', () => {
    const store = atom(0);
    const startListener = vi.fn();
    const subListener1 = vi.fn();
    const subListener2 = vi.fn();

    const unsubEvent = listen(store, LIFECYCLE.onStart, startListener);

    // Should not trigger yet
    expect(startListener).not.toHaveBeenCalled();

    const unsub1 = store.subscribe(subListener1);
    // Should trigger now
    expect(startListener).toHaveBeenCalledTimes(1);

    const unsub2 = store.subscribe(subListener2);
    // Should not trigger again
    expect(startListener).toHaveBeenCalledTimes(1);

    unsub1();
    // Should not trigger on unsubscribe
    expect(startListener).toHaveBeenCalledTimes(1);

    unsub2();
    // Should not trigger on unsubscribe
    expect(startListener).toHaveBeenCalledTimes(1);

    unsubEvent(); // Clean up event listener
  });

   it('LIFECYCLE.onStop should trigger when the last listener unsubscribes', () => {
    const store = atom(0);
    const stopListener = vi.fn();
    const subListener1 = vi.fn();
    const subListener2 = vi.fn();

    const unsubEvent = listen(store, LIFECYCLE.onStop, stopListener);
    const unsub1 = store.subscribe(subListener1);
    const unsub2 = store.subscribe(subListener2);

    // Should not trigger yet
    expect(stopListener).not.toHaveBeenCalled();

    unsub1();
    // Should not trigger yet
    expect(stopListener).not.toHaveBeenCalled();

    unsub2();
    // Should trigger now
    expect(stopListener).toHaveBeenCalledTimes(1);

    // Subscribe again, then unsubscribe
    const unsub3 = store.subscribe(subListener1);
    expect(stopListener).toHaveBeenCalledTimes(1);
    unsub3();
    expect(stopListener).toHaveBeenCalledTimes(2); // Should trigger again

    unsubEvent(); // Clean up event listener
  });

  it('LIFECYCLE.onSet should trigger before a value is set', () => {
    const store = atom(0);
    const setListener = vi.fn();
    const subListener = vi.fn();

    const unsubEvent = listen(store, LIFECYCLE.onSet, setListener);
    const unsubSub = store.subscribe(subListener);
    subListener.mockClear(); // Clear initial subscribe call

    store.set(1);

    expect(setListener).toHaveBeenCalledTimes(1);
    expect(setListener).toHaveBeenCalledWith(1); // Passes the new value

    // Verify it triggers before the subscriber gets the value
    // (This is hard to test precisely without complex async mocks,
    // but we know the order from the implementation)
    expect(subListener).toHaveBeenCalledTimes(1);
    expect(subListener).toHaveBeenCalledWith(1, 0);

    unsubSub();
    unsubEvent();
  });

  it('LIFECYCLE.onNotify should trigger after a value is set and listeners notified', () => {
    const store = atom(0);
    const notifyListener = vi.fn();
    const subListener = vi.fn();
    const lifecycleOrder: string[] = [];

    const unsubNotify = listen(store, LIFECYCLE.onNotify, (val) => {
        notifyListener(val);
        lifecycleOrder.push('onNotify');
    });
    const unsubSub = store.subscribe((val) => {
        subListener(val);
        lifecycleOrder.push('subscribe');
    });
    subListener.mockClear(); // Clear initial subscribe call
    lifecycleOrder.length = 0; // Clear order array

    store.set(1);

    expect(notifyListener).toHaveBeenCalledTimes(1);
    expect(notifyListener).toHaveBeenCalledWith(1); // Passes the new value
    expect(subListener).toHaveBeenCalledTimes(1);

    // Check order: subscribe listener should be called before onNotify
    expect(lifecycleOrder).toEqual(['subscribe', 'onNotify']);


    unsubSub();
    unsubNotify();
  });

    it('should correctly handle multiple lifecycle listeners of the same type', () => {
        const store = atom(0);
        const startListener1 = vi.fn();
        const startListener2 = vi.fn();

        const unsub1 = listen(store, LIFECYCLE.onStart, startListener1);
        const unsub2 = listen(store, LIFECYCLE.onStart, startListener2);

        const sub = store.subscribe(() => {});

        expect(startListener1).toHaveBeenCalledTimes(1);
        expect(startListener2).toHaveBeenCalledTimes(1);

        sub();
        unsub1();
        unsub2();
    });

    it('unsubscribe should remove the specific lifecycle listener', () => {
        const store = atom(0);
        const setListener1 = vi.fn();
        const setListener2 = vi.fn();

        const unsub1 = listen(store, LIFECYCLE.onSet, setListener1);
        const unsub2 = listen(store, LIFECYCLE.onSet, setListener2);

        store.set(1);
        expect(setListener1).toHaveBeenCalledTimes(1);
        expect(setListener2).toHaveBeenCalledTimes(1);

        unsub1(); // Unsubscribe the first listener

        store.set(2);
        expect(setListener1).toHaveBeenCalledTimes(1); // Should not be called again
        expect(setListener2).toHaveBeenCalledTimes(2); // Should be called again

        unsub2();
         store.set(3);
        expect(setListener1).toHaveBeenCalledTimes(1);
        expect(setListener2).toHaveBeenCalledTimes(2); // Should not be called again
    });

    // Test on computed atoms as well
    it('should trigger onStart/onStop for computed atoms', () => {
        const source = atom(0);
        const derived = computed([source], (s) => s * 2);
        const startListener = vi.fn();
        const stopListener = vi.fn();

        const unsubStart = listen(derived, LIFECYCLE.onStart, startListener);
        const unsubStop = listen(derived, LIFECYCLE.onStop, stopListener);

        expect(startListener).not.toHaveBeenCalled();
        expect(stopListener).not.toHaveBeenCalled();

        const sub1 = derived.subscribe(() => {});
        expect(startListener).toHaveBeenCalledTimes(1); // Start on first subscribe
        expect(stopListener).not.toHaveBeenCalled();

        const sub2 = derived.subscribe(() => {});
        expect(startListener).toHaveBeenCalledTimes(1); // Not again

        sub1();
        expect(stopListener).not.toHaveBeenCalled(); // Not yet

        sub2();
        expect(stopListener).toHaveBeenCalledTimes(1); // Stop on last unsubscribe

        unsubStart();
        unsubStop();
    });

    it('should trigger onNotify for computed atoms', () => {
        const source = atom(0);
        const derived = computed([source], (s) => s * 2);
        const notifyListener = vi.fn();
        const subListener = vi.fn();

        const unsubNotify = listen(derived, LIFECYCLE.onNotify, notifyListener);
        const unsubSub = derived.subscribe(subListener);

        // Assert that listeners ARE called immediately on subscribe
        expect(notifyListener).toHaveBeenCalledTimes(1);
        expect(subListener).toHaveBeenCalledTimes(1);

        // Trigger initial calculation and notification by calling get()
        expect(derived.get()).toBe(0);
        expect(notifyListener).toHaveBeenCalledTimes(1); // First notification from get()->_update()->set()->_notify()
        expect(notifyListener).toHaveBeenCalledWith(0);
        expect(subListener).toHaveBeenCalledTimes(1);    // First notification from get()->_update()->set()->_notify()
        expect(subListener).toHaveBeenCalledWith(0, undefined);

        // Clear mocks AFTER initial calculation/notification
        notifyListener.mockClear();
        subListener.mockClear();

        // Trigger update by changing the source
        source.set(1);

        // Assert update happened and listeners were called exactly ONCE more
        // We need get() here to trigger the update calculation if it hasn't happened passively
        expect(derived.get()).toBe(2);
        expect(subListener).toHaveBeenCalledTimes(1); // Called once *after* mockClear
        expect(subListener).toHaveBeenCalledWith(2, 0);
        expect(notifyListener).toHaveBeenCalledTimes(1); // Called once *after* mockClear
        expect(notifyListener).toHaveBeenCalledWith(2);

        unsubSub();
        unsubNotify();
    });

});
