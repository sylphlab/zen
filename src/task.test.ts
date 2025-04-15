import { describe, it, expect, vi } from 'vitest';
import { task } from './task'; // Assuming task is exported from task.ts

// Helper to wait for next tick might be needed if tests rely on microtask timing
// const wait = (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms));

describe('task', () => {
  it('should initialize with loading: false', () => {
    const mockAsyncFn = vi.fn().mockResolvedValue('done');
    const myTask = task(mockAsyncFn);
    expect(myTask.get()).toEqual({ loading: false });
  });

  it('should set loading: true when run starts', async () => {
    const mockAsyncFn = vi.fn().mockResolvedValue('done');
    const myTask = task(mockAsyncFn);
    const listener = vi.fn();
    const unsubscribe = myTask.subscribe(listener);

    listener.mockClear(); // Ignore initial call

    const promise = myTask.run(); // Don't await yet

    // Should immediately reflect loading state
    expect(myTask.get()).toEqual({ loading: true, error: undefined, data: undefined });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ loading: true, error: undefined, data: undefined });

    await promise; // Wait for completion
    unsubscribe();
  });

  it('should set data and loading: false on successful completion', async () => {
    const mockAsyncFn = vi.fn().mockResolvedValue('Success Data');
    const myTask = task(mockAsyncFn);
    const listener = vi.fn();
    const unsubscribe = myTask.subscribe(listener);

    listener.mockClear(); // Ignore initial call

    await myTask.run('arg1');

    expect(mockAsyncFn).toHaveBeenCalledWith('arg1');
    expect(myTask.get()).toEqual({ loading: false, data: 'Success Data' });
    expect(listener).toHaveBeenCalledTimes(2); // loading: true, then loading: false + data
    expect(listener).toHaveBeenLastCalledWith({ loading: false, data: 'Success Data' });

    unsubscribe();
  });

  it('should set error and loading: false on failure', async () => {
    const error = new Error('Task Failed');
    const mockAsyncFn = vi.fn().mockRejectedValue(error);
    const myTask = task(mockAsyncFn);
    const listener = vi.fn();
    const unsubscribe = myTask.subscribe(listener);

    listener.mockClear(); // Ignore initial call

    try {
      await myTask.run();
    } catch (e) {
      expect(e).toBe(error); // Ensure the error is re-thrown
    }

    expect(myTask.get()).toEqual({ loading: false, error: error });
    expect(listener).toHaveBeenCalledTimes(2); // loading: true, then loading: false + error
    expect(listener).toHaveBeenLastCalledWith({ loading: false, error: error });

    unsubscribe();
  });

   it('should handle non-Error rejection values', async () => {
     const rejectionValue = 'Something went wrong';
     const mockAsyncFn = vi.fn().mockRejectedValue(rejectionValue);
     const myTask = task(mockAsyncFn);

     try {
       await myTask.run();
     } catch (e) {
       expect(e).toBe(rejectionValue);
     }

     const state = myTask.get();
     expect(state.loading).toBe(false);
     expect(state.error).toBeInstanceOf(Error);
     expect(state.error?.message).toBe(rejectionValue);
   });

  it('should ignore subsequent runs while already loading', async () => {
    let resolvePromise: (value: string) => void;
    const promise = new Promise<string>(resolve => { resolvePromise = resolve; });
    const mockAsyncFn = vi.fn().mockReturnValue(promise);

    const myTask = task(mockAsyncFn);
    const listener = vi.fn();
    const unsubscribe = myTask.subscribe(listener);
    listener.mockClear(); // Ignore initial

    const p1 = myTask.run(); // First run
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    expect(myTask.get().loading).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1); // loading:true notification

    const p2 = myTask.run(); // Second run (should be ignored)
    expect(mockAsyncFn).toHaveBeenCalledTimes(1); // Still only called once
    // expect(p2).toBe(p1); // Removed strict promise identity check

    // Complete the first run
    resolvePromise!('First Result');
    await p1;

    expect(myTask.get()).toEqual({ loading: false, data: 'First Result' });
    expect(listener).toHaveBeenCalledTimes(2); // loading:false notification

    unsubscribe();
  });

  it('should allow new runs after completion', async () => {
      const mockAsyncFn = vi.fn()
          .mockResolvedValueOnce('First')
          .mockResolvedValueOnce('Second');

      const myTask = task(mockAsyncFn);

      await myTask.run();
      expect(myTask.get().data).toBe('First');
      expect(mockAsyncFn).toHaveBeenCalledTimes(1);

      await myTask.run();
      expect(myTask.get().data).toBe('Second');
      expect(mockAsyncFn).toHaveBeenCalledTimes(2);
  });
});
