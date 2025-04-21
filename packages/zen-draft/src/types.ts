// Define the Patch structure, including standard ops, plus custom ops for Sets
export interface Patch {
  op: 'replace' | 'add' | 'remove' | 'move' | 'copy' | 'test' | 'set_add' | 'set_delete'; // Add standard ops + custom Set ops
  path: (string | number)[]; // Target path
  value?: unknown; // Value used for add, replace, test, set_add, set_delete
  from?: (string | number)[]; // Source path used for move, copy
}

// Options for the produce function
export interface ProduceOptions {
  patches?: boolean;
  inversePatches?: boolean;
  autoFreeze?: boolean; // Add autoFreeze option
}

// Result tuple type
export type ProduceResult<State> = [State, Patch[], Patch[]];
