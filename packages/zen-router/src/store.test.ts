import { describe, expect, it, vi } from 'vitest';
import { createRouter } from './store'; // Assuming store.ts exports createRouter

describe('createRouter (Simple Store)', () => {
  it('should initialize with null value', () => {
    const router = createRouter<string>();
    expect(router.get()).toBeNull();
  });

  it('should set and get a value', () => {
    const router = createRouter<string>();
    router.set('newState');
    expect(router.get()).toBe('newState');
  });

  it('should call listener immediately on subscribe', () => {
    const router = createRouter<string>();
    router.set('initial');
    const listener = vi.fn();
    router.subscribe(listener);
    expect(listener).toHaveBeenCalledWith('initial', undefined);
  });

  it('should call listener on set', () => {
    const router = createRouter<string>();
    const listener = vi.fn();
    router.subscribe(listener); // Initial call
    listener.mockClear(); // Clear initial call

    router.set('update1');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('update1', null); // Old value was null initially

    router.set('update2');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith('update2', 'update1');
  });

  it('should handle multiple listeners', () => {
    const router = createRouter<number>();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    router.subscribe(listener1);
    router.subscribe(listener2);
    listener1.mockClear();
    listener2.mockClear();

    router.set(10);
    expect(listener1).toHaveBeenCalledWith(10, null);
    expect(listener2).toHaveBeenCalledWith(10, null);
  });

  it('should stop calling listener after unsubscribe', () => {
    const router = createRouter<boolean>();
    const listener = vi.fn();
    const unsubscribe = router.subscribe(listener);
    listener.mockClear();

    unsubscribe();

    router.set(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should ignore errors within listeners during set', () => {
    const router = createRouter<string>();
    const badListener = vi.fn(() => {
      throw new Error('Listener error');
    });
    const goodListener = vi.fn();

    router.subscribe(badListener);
    router.subscribe(goodListener);
    badListener.mockClear();
    goodListener.mockClear();

    expect(() => router.set('test')).not.toThrow();
    expect(badListener).toHaveBeenCalledTimes(1);
    expect(goodListener).toHaveBeenCalledTimes(1); // Good listener should still be called
  });

  it('should ignore errors within listeners during subscribe', () => {
    const router = createRouter<string>();
    const badListener = vi.fn(() => {
      throw new Error('Listener error');
    });

    expect(() => router.subscribe(badListener)).not.toThrow();
    expect(badListener).toHaveBeenCalledTimes(1); // Listener is still called initially
  });
});
