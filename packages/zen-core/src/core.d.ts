import type { LifecycleListener } from './events';
/** Callback function type for atom listeners. */
export type Listener<T> = (value: T, oldValue?: T) => void;
/** Function to unsubscribe a listener. */
export type Unsubscribe = () => void;
/**
 * Represents a writable atom, the basic unit of state.
 */
export type Atom<T = any> = {
    get(): T;
    set(v: T, force?: boolean): void;
    subscribe(fn: Listener<T>): Unsubscribe;
    _value: T;
    _listeners?: Set<Listener<T>>;
    _startListeners?: Set<LifecycleListener<T>>;
    _stopListeners?: Set<LifecycleListener<T>>;
    _setListeners?: Set<LifecycleListener<T>>;
    _notifyListeners?: Set<LifecycleListener<T>>;
    _mountListeners?: Set<LifecycleListener<T>>;
    _oldValueBeforeBatch?: T;
    _notify(value: T, oldValue?: T): void;
    _notifyBatch?(): void;
    _patchedForEvents?: boolean;
    _patchedForBatching?: boolean;
    [key: symbol]: any;
};
/**
 * Represents a read-only atom, often used for computed values.
 * It shares some properties with Atom but lacks the `set` method
 * and includes properties specific to derived state.
 */
export type ReadonlyAtom<T = any> = {
    get(): T;
    subscribe(fn: Listener<T>): Unsubscribe;
    _value: T;
    _listeners?: Set<Listener<T>>;
    _startListeners?: Set<LifecycleListener<T>>;
    _stopListeners?: Set<LifecycleListener<T>>;
    _setListeners?: Set<LifecycleListener<T>>;
    _notifyListeners?: Set<LifecycleListener<T>>;
    _mountListeners?: Set<LifecycleListener<T>>;
    _notify(value: T, oldValue?: T): void;
    _notifyBatch?(): void;
    _patchedForEvents?: boolean;
    _dirty?: boolean;
    _sources?: ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
    _sourceValues?: any[];
    _calculation?: Function;
    _equalityFn?: (a: T, b: T) => boolean;
    _unsubscribers?: Unsubscribe[];
    _onChangeHandler?: Listener<any>;
    _onChange?(): void;
    _update?(): boolean;
    _subscribeToSources?(): void;
    _unsubscribeFromSources?(): void;
    _isSubscribing?: boolean;
    [key: symbol]: any;
};
/**
 * The base prototype shared by all atoms created via `atom()`.
 * Contains the minimal core logic for get, set, and subscribe.
 * Event and batching functionalities are added dynamically via patching.
 */
export declare const AtomProto: Atom<any>;
