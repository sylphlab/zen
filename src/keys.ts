// Defines internal symbols used within the library.

/**
 * Symbol used internally by `map` and `deepMap` atoms to indicate
 * they support key or path-specific listeners (`listenKeys`, `listenPaths`).
 * This allows functions like `listenKeys` to verify they are called on a compatible atom type.
 * @internal
 */
export const STORE_MAP_KEY_SET = Symbol('zen_store_map_marker');

// No other keys currently defined. The named export above ensures this is treated as a module.
