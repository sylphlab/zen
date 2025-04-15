// src/keys.ts

/**
 * Symbol used internally by `map` and `deepMap` to mark atoms
 * that support key-specific listeners (`listenKeys`).
 * This helps prevent misuse of `listenKeys` on standard atoms.
 */
export const STORE_MAP_KEY_SET = Symbol('store_map_key_set');

// Keep export {} for now in case other keys are added later,
// ensures it's treated as a module.
export {};
