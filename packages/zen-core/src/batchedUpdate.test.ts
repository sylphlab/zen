import { afterEach, describe, expect, test, vi } from 'vitest';
import { batchedUpdate } from './batchedUpdate';

// Helper to wait for the next microtask tick
const nextTick = () => new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

describe('batchedUpdate', () => {
  afterEach(() => {
    // Ensure any pending microtasks from failed tests are cleared
    // (Although batchedUpdate should handle its own state)
  });

  test('should run the function once after microtask', async () => {
    const fn = vi.fn();
    const trigger = batchedUpdate(fn);

    trigger();
    trigger();
    trigger();

    expect(fn).not.toHaveBeenCalled(); // Not called synchronously

    await nextTick();

    expect(fn).toHaveBeenCalledTimes(1); // Called only once
  });

  test('should run different batched functions independently', async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const trigger1 = batchedUpdate(fn1);
    const trigger2 = batchedUpdate(fn2);

    trigger1();
    trigger2();
    trigger1(); // Call trigger1 again

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();

    await nextTick();

    expect(fn1).toHaveBeenCalledTimes(1); // fn1 called once
    expect(fn2).toHaveBeenCalledTimes(1); // fn2 called once
  });

  test('should handle errors in the batched function gracefully', async () => {
    const error = new Error('Test Error');
    const fn = vi.fn(() => {
      throw error;
    });
    const trigger = batchedUpdate(fn);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    trigger();
    expect(fn).not.toHaveBeenCalled();

    await nextTick();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error during batched callback execution:', error);

    consoleErrorSpy.mockRestore();
  });

  test('should allow scheduling again after execution', async () => {
    const fn = vi.fn();
    const trigger = batchedUpdate(fn);

    trigger();
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);

    trigger();
    trigger();
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(2); // Called again
  });
});
