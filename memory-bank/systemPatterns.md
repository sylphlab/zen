# System Patterns: zen Library

## Core Architecture
- **Event-driven/Reactive:** State changes trigger updates to subscribers.
- **Atom-based:** The fundamental unit of state is represented by simple objects (`Atom`, `ComputedAtom`, `MapAtom`, etc.), holding data and minimal internal state.
- **Minimalism:** Extreme focus on bundle size and performance. Features justify existence via impact. Avoid unnecessary abstractions and dependencies.
- **Functional API:** Public interaction via imported functions (`createAtom`, `get`, `set`, `subscribe`, etc.) rather than methods on atom objects.
- **Module Structure:** Core types (`types.ts`), type guards (`typeGuards.ts`), internal utilities (`internalUtils.ts`), and specific atom logic (`atom.ts`, `computed.ts`, etc.) are separated to improve organization and prevent circular dependencies.

## Key Design Patterns
- **Observer Pattern:** Internal `_listeners` sets manage subscriptions.
- **Lazy Listener Initialization:** Listener sets (`_listeners`, `_startListeners`, etc.) are only added to atom objects when the first listener of that type is attached, minimizing creation overhead.
- **Structural Type Differentiation:** Internal logic uses type guards based on property checks (e.g., `'_calculation' in atom`) for runtime type distinction, avoiding classes/`instanceof` and type markers.
- **Immutability:** Map/DeepMap updates create new objects (`{...spread}` or deep cloning logic).

## API Design Philosophy
- Mirror Nanostores' simplicity where feasible (unified `get`, `subscribe`).
- Functions are small, focused, and highly tree-shakeable.
- Prioritize raw performance (especially creation speed) and minimal code footprint.
