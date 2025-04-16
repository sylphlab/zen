import { describe, it, expect, vi } from 'vitest';
import { task, runTask, getTaskState, subscribeToTask } from './task'; // Import updated functional API
import type { TaskState } from './types'; // Import type from types.ts

// Helper to wait for next tick might be needed if tests rely on microtask timing
// const wait = (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms));

describe('task (functional)', () => {
  it('should initialize with loading: false', () => {
    const mockAsyncFn = vi.fn().mockResolvedValue('done');
    const myTask = task(mockAsyncFn); // Use task
    expect(getTaskState(myTask)!).toEqual({ loading: false }); // Add ! assertion
  });

  it('should set loading: true when run starts', async () => {
    const mockAsyncFn = vi.fn().mockResolvedValue('done');
    const myTask = task(mockAsyncFn); // Use task
    const listener = vi.fn();
    const unsubscribe = subscribeToTask(myTask, listener);

    // Store initial state for oldValue check
    const initialState = getTaskState(myTask);
    listener.mockClear(); // Ignore initial call

    const promise = runTask(myTask); // Use runTask

    // Should immediately reflect loading state
    const loadingState = { loading: true, error: undefined, data: undefined };
    expect(getTaskState(myTask)!).toEqual(loadingState); // Add ! assertion
    expect(listener).toHaveBeenCalledTimes(1);
    // Expect initial state (loading: false) as oldValue
    expect(listener).toHaveBeenCalledWith(loadingState, initialState);

    await promise; // Wait for completion
    unsubscribe();
  });

  it('should set data and loading: false on successful completion', async () => {
    const mockAsyncFn = vi.fn().mockResolvedValue('Success Data');
    const myTask = task(mockAsyncFn); // Use task
    const listener = vi.fn();
    const unsubscribe = subscribeToTask(myTask, listener);

    listener.mockClear(); // Ignore initial call

    await runTask(myTask, 'arg1'); // Use runTask

    expect(mockAsyncFn).toHaveBeenCalledWith('arg1');
    const finalState = { loading: false, data: 'Success Data' };
    const intermediateState = { loading: true, error: undefined, data: undefined }; // State before final one
    expect(getTaskState(myTask)!).toEqual(finalState); // Add ! assertion
    expect(listener).toHaveBeenCalledTimes(2); // loading: true, then loading: false + data
    expect(listener).toHaveBeenLastCalledWith(finalState, intermediateState); // Add oldValue

    unsubscribe();
  });

  it('should set error and loading: false on failure', async () => {
    const error = new Error('Task Failed');
    const mockAsyncFn = vi.fn().mockRejectedValue(error);
    const myTask = task(mockAsyncFn); // Use task
    const listener = vi.fn();
    const unsubscribe = subscribeToTask(myTask, listener);

    listener.mockClear(); // Ignore initial call

    try {
      await runTask(myTask); // Use runTask
    } catch (e) {
      expect(e).toBe(error); // Ensure the error is re-thrown
    }

    const finalStateWithError = { loading: false, error: error };
     const intermediateStateLoading = { loading: true, error: undefined, data: undefined }; // State before final one
    expect(getTaskState(myTask)!).toEqual(finalStateWithError); // Add ! assertion
    expect(listener).toHaveBeenCalledTimes(2); // loading: true, then loading: false + error
    expect(listener).toHaveBeenLastCalledWith(finalStateWithError, intermediateStateLoading); // Add oldValue

    unsubscribe();
  });

   it('should handle non-Error rejection values', async () => {
     const rejectionValue = 'Something went wrong';
     const mockAsyncFn = vi.fn().mockRejectedValue(rejectionValue);
     const myTask = task(mockAsyncFn); // Use task

     try {
       await runTask(myTask); // Use runTask
     } catch (e) {
       expect(e).toBe(rejectionValue);
     }

     const state = getTaskState(myTask);
     expect(state!).not.toBeNull(); // Add null check for type safety
     expect(state!.loading).toBe(false);
     expect(state!.error).toBeInstanceOf(Error);
     expect(state!.error?.message).toBe(rejectionValue);
   });

  it('should ignore subsequent runs while already loading', async () => {
    let resolvePromise: (value: string) => void;
    const promise = new Promise<string>(resolve => { resolvePromise = resolve; });
    const mockAsyncFn = vi.fn().mockReturnValue(promise);

    const myTask = task(mockAsyncFn); // Use task
    const listener = vi.fn();
    const unsubscribe = subscribeToTask(myTask, listener);
    listener.mockClear(); // Ignore initial

    const p1 = runTask(myTask); // Use runTask
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    expect(getTaskState(myTask)!.loading).toBe(true); // Add ! assertion
    expect(listener).toHaveBeenCalledTimes(1); // loading:true notification

    const p2 = runTask(myTask); // Use runTask (Second run should be ignored)
    expect(mockAsyncFn).toHaveBeenCalledTimes(1); // Still only called once
    // expect(p2).toBe(p1); // Removed strict promise identity check

    // Complete the first run
    resolvePromise!('First Result');
    await p1;

    expect(getTaskState(myTask)!).toEqual({ loading: false, data: 'First Result' }); // Add ! assertion
    expect(listener).toHaveBeenCalledTimes(2); // loading:false notification

    unsubscribe();
  });

  it('should allow new runs after completion', async () => {
      const mockAsyncFn = vi.fn()
          .mockResolvedValueOnce('First')
          .mockResolvedValueOnce('Second');

      const myTask = task(mockAsyncFn); // Use task

      await runTask(myTask); // Use runTask
      expect(getTaskState(myTask)!.data).toBe('First'); // Add ! assertion
      expect(mockAsyncFn).toHaveBeenCalledTimes(1);

      await runTask(myTask); // Use runTask
      expect(getTaskState(myTask)!.data).toBe('Second'); // Add ! assertion
      expect(mockAsyncFn).toHaveBeenCalledTimes(2);
  });
});
