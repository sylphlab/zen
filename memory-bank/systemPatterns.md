# System Patterns: zen Library

## Core Architecture
- **Event-driven/Reactive:** State changes trigger updates to subscribers.
- **Atom-based:** The fundamental unit of state is an "atom" or similar concept, holding a single piece of data.
- **Minimalism:** Every feature and line of code must justify its existence in terms of bundle size and performance impact. Avoid unnecessary abstractions.

## Key Design Patterns
- **Observer Pattern:** Atoms act as subjects, listeners/subscribers act as observers.
- **Lazy Evaluation (Potential):** Consider if derived state computations should only run when their value is requested or dependencies change.
- **Immutability (Potential):** Explore whether enforcing immutable state updates simplifies logic or improves predictability, weighing against potential performance overhead for simple cases.

## API Design Philosophy
- Mirror Nanostores' simplicity where feasible.
- Functions should be small, focused, and highly tree-shakeable.
- Prioritize raw performance and minimal code over developer ergonomics if a significant trade-off exists.
