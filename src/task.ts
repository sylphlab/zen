// Ultra-optimized task implementation for managing async operations
import { Atom, Listener, Unsubscribe } from './core';
import { atom } from './atom';

// Task state interface
export interface TaskState<T = any> {
  loading: boolean;
  error?: Error;
  data?: T;
}

// Task atom interface
export interface TaskAtom<T = any> {
  get(): TaskState<T>;
  subscribe(listener: Listener<TaskState<T>>): Unsubscribe;
  run(...args: any[]): Promise<T>;
}

/**
 * Create a task atom for managing async operations
 * 
 * @param asyncFn Async function to execute
 * @returns TaskAtom instance
 */
export function task<T = void>(
  asyncFn: (...args: any[]) => Promise<T>
): TaskAtom<T> {
  // Internal state atom
  const stateAtom = atom<TaskState<T>>({ loading: false });
  
  // Keep track of running promise
  let runningPromise: Promise<T> | null = null;
  
  // Create task instance
  const taskAtom: TaskAtom<T> = {
    // Delegate basic atom methods to internal state atom
    get: () => stateAtom.get(),
    subscribe: (listener) => stateAtom.subscribe(listener),
    
    // Task execution method
    run: function(...args: any[]): Promise<T> {
      // Return existing promise if already running
      if (runningPromise) {
        return runningPromise;
      }
      
      // Inner async function for execution
      const execute = async (): Promise<T> => {
        // Set loading state
        stateAtom.set({ loading: true });
        
        // Execute async function
        const promise = asyncFn(...args);
        runningPromise = promise;
        
        try {
          // Wait for completion
          const result = await promise;
          
          // Only update state if this is still the active promise
          if (runningPromise === promise) {
            stateAtom.set({ loading: false, data: result });
            runningPromise = null;
          }
          
          return result;
        } catch (error) {
          // Only update state if this is still the active promise
          if (runningPromise === promise) {
            // Convert error to proper Error object
            const errorObj = error instanceof Error 
              ? error 
              : new Error(String(error));
            
            stateAtom.set({ loading: false, error: errorObj });
            runningPromise = null;
          }
          
          throw error;
        }
      };
      
      // Start execution and return promise
      return execute();
    }
  };
  
  return taskAtom;
}
