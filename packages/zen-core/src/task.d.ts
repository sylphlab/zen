import type { Listener, TaskAtom, TaskState, Unsubscribe /* AtomWithValue, */ } from './types';
/**
 * Creates a Task Atom to manage the state of an asynchronous operation.
 *
 * @template T The type of the data returned by the async function.
 * @param asyncFn The asynchronous function to execute when `runTask` is called.
 * @returns A TaskAtom instance.
 */
export declare function task<T = void, Args extends unknown[] = unknown[]>(
  // Use unknown[] for Args
  asyncFn: (...args: Args) => Promise<T>,
): TaskAtom<T, Args>;
/**
 * Runs the asynchronous function associated with the task.
 * If the task is already running, returns the existing promise.
 * Updates the task's state atom based on the outcome.
 * @param taskAtom The task atom to run.
 * @param args Arguments to pass to the asynchronous function.
 * @returns A promise that resolves with the result or rejects with the error.
 */
export declare function runTask<T, Args extends unknown[]>(
  taskAtom: TaskAtom<T, Args>,
  ...args: Args
): Promise<T>;
/**
 * Gets the current state of a task atom.
 * @param taskAtom The task atom to read from.
 * @returns The current TaskState.
 */
export declare function getTaskState<T>(taskAtom: TaskAtom<T>): TaskState<T>;
/**
 * Subscribes to changes in a task atom's state.
 * @param taskAtom The task atom to subscribe to.
 * @param listener The listener function.
 * @returns An unsubscribe function.
 */
export declare function subscribeToTask<T>(
  taskAtom: TaskAtom<T>,
  listener: Listener<TaskState<T>>,
): Unsubscribe;
