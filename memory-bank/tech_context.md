# Tech Context: zen Library

## Core Technologies
- **Language:** TypeScript (strict mode enabled)
- **Target Environment:** Modern Browsers, Node.js (via ESM)
- **Build Tool:** TBD (Candidates: Rollup, ESBuild - prioritize minimal output)
- **Testing Framework:** TBD (Candidates: Vitest, Jest - prioritize speed and simplicity)
- **Package Manager:** npm (or pnpm/yarn if specific features needed later)

## Development Setup
- Standard Node.js/npm environment.
- TypeScript compiler (`tsc`).
- Linter/Formatter: Biome (replaces ESLint/Prettier).


## Constraints & Considerations
- **Bundle Size:** Extreme focus. Every byte matters. Avoid dependencies where possible. Leverage tree-shaking aggressively.
- **Performance:** Runtime speed is paramount. Benchmark against Nanostores.
- **Compatibility:** Target modern ES Modules (ESM) standards. Provide CommonJS build if necessary but prioritize ESM.
- **TypeScript:** Leverage strong typing for reliability but ensure compiled output is minimal.

## Guideline Checksums
(Initially empty, will be populated when guidelines are fetched)
