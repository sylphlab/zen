/**
 * Symbol used internally by `map` and `deepMap` atoms to indicate
 * they support key or path-specific listeners (`listenKeys`, `listenPaths`).
 * This allows functions like `listenKeys` to verify they are called on a compatible atom type.
 * @internal
 */
export declare const STORE_MAP_KEY_SET: unique symbol;
