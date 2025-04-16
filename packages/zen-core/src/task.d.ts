import { Listener, Unsubscribe } from './core';
/**
 * Represents the possible states of a task atom.
 * @property loading - True if the task is currently running.
 * @property error - An Error object if the last run failed.
 * @property data - The data returned from the last successful run.
 */
export type TaskState<T = any> = {
    loading: boolean;
    error?: Error;
    data?: T;
};
/**
 * Represents a Task Atom, which wraps an asynchronous function
 * and provides its state (loading, error, data) as a reactive atom.
 */
export type TaskAtom<T = any> = {
    /** Gets the current state of the task (loading, error, data). */
    get(): TaskState<T>;
    /** Subscribes to changes in the task's state. */
    subscribe(listener: Listener<TaskState<T>>): Unsubscribe;
    /**
     * Runs the asynchronous function associated with the task.
     * If the task is already running, returns the existing promise.
     * Updates the task's state atom based on the outcome.
     * @param args Arguments to pass to the asynchronous function.
     * @returns A promise that resolves with the result or rejects with the error.
     */
    run(...args: any[]): Promise<T>;
};
/**
 * Creates a Task Atom to manage the state of an asynchronous operation.
 *
 * @template T The type of the data returned by the async function.
 * @param asyncFn The asynchronous function to execute when `run` is called.
 * @returns A TaskAtom instance.
 */
export declare function task<T = void>(asyncFn: (...args: any[]) => Promise<T>): TaskAtom<T>;
