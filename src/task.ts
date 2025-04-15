// 极致优化的轻量级状态管理库 (怪兽性能版) - Task Atom 实现

import { ReadonlyAtom, Listener, Atom } from './core'; // Import Atom from core
import { atom } from './atom';

// Task Atom 状态类型
export interface TaskState<T = any> {
  loading: boolean;
  error?: Error;
  data?: T;
}

// Task Atom 类型定义 (扩展 ReadonlyAtom)
export interface TaskAtom<T = any> extends ReadonlyAtom<TaskState<T>> {
  run(...args: any[]): Promise<T>;
}

/**
 * 创建一个用于管理异步操作状态的 Task Atom。
 *
 * @param asyncFn 执行异步操作的函数
 * @returns TaskAtom 实例
 */
export function task<T = void>(
  asyncFn: (...args: any[]) => Promise<T>
): TaskAtom<T> {
  // 内部 atom 存储状态 { loading, error, data }
  const taskState: Atom<TaskState<T>> = atom<TaskState<T>>({ loading: false });

  // 存储当前正在运行的 Promise
  let runningPromise: Promise<T> | null = null;

  // 创建符合 TaskAtom 接口的对象
  const taskInstance: TaskAtom<T> = {
    // Delegate core ReadonlyAtom methods to the internal atom
    get: taskState.get.bind(taskState), // Bind 'this'
    subscribe: taskState.subscribe.bind(taskState), // Bind 'this'
    // Expose internal value and listeners as readonly properties if needed by interface
    // Use getters to delegate
    get value() { return taskState.value; },
    get listeners() { return taskState.listeners; },
    // Internal methods required by ReadonlyAtom interface (delegate)
    _notify: taskState._notify.bind(taskState),
    _notifyBatch: taskState._notifyBatch.bind(taskState),
    get _value() { return taskState._value },
    get _listeners() { return taskState._listeners },

    // run 方法实现 (Refactored)
    run: function (...args: any[]): Promise<T> {
      // Synchronously check if already running
      if (runningPromise) {
        return runningPromise; // Return the exact same promise instance
      }

      // Inner async function to perform the actual task execution
      const execute = async (): Promise<T> => {
          // Use the internal taskState's set method
          taskState.set({ loading: true, error: undefined, data: undefined });

          const promise = asyncFn(...args);
          // Store the promise returned by the *original* asyncFn call
          runningPromise = promise;

          try {
              const result = await promise;
              // Check if this is still the active promise before updating state
              if (runningPromise === promise) {
                  taskState.set({ loading: false, data: result });
                  runningPromise = null; // Clear after completion
              }
              return result;
          } catch (error) {
              // Check if this is still the active promise before updating state
              if (runningPromise === promise) {
                  const errorObj = error instanceof Error ? error : new Error(String(error));
                  taskState.set({ loading: false, error: errorObj });
                  runningPromise = null; // Clear after completion
              }
              throw error; // Re-throw
          }
      };

      // Start the execution and return the resulting promise
      return execute();
    }
  };

  // Freeze the instance to make it more like a ReadonlyAtom (optional, adds slight overhead)
  // if (Object.freeze) {
  //   Object.freeze(taskInstance);
  // }

  return taskInstance;
}
