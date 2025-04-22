import { afterEach, describe, expect, it, vi } from 'vitest';
import { computed } from './computed'; // Import computed
import { get as getAtomValue, set as setAtomValue, subscribe as subscribeToAtom, zen } from './zen'; // Import updated functional API

// // Mock the internal subscribe/unsubscribe functions for dependency tracking test - REMOVED due to vi.mock error
// vi.mock('./atom', async (importOriginal) => {
//   const original = await importOriginal() as typeof import('./atom');
//   return {
//     ...original,
//     subscribe: vi.fn(original.subscribe), // Spy on subscribe (renamed from subscribeToAtom)
//   };
// });

describe('computed (functional)', () => {
  // // Clear mocks after each test in this suite - REMOVED due to vi.mock removal
  // afterEach(() => {
  //   vi.restoreAllMocks();
  //   // Clear specific mock history if needed
  //   (subscribeToAtom as any).mockClear?.(); // Keep mock clear target as subscribeToAtom for now
  // });

  it('should compute initial value correctly', () => {
    const count = zen(10); // Use zen
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const double = computed([count as any], (value: unknown) => (value as number) * 2); // Use computed, accept unknown, cast inside
    expect(getAtomValue(double)).toBe(20);
  });

  it('should update when a dependency atom changes', () => {
    const count = zen(10); // Use zen
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const double = computed([count as any], (value: unknown) => (value as number) * 2); // Use computed, accept unknown, cast inside

    // Subscribe to activate dependency tracking, add cast
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsub = subscribeToAtom(double as any, () => {});

    expect(getAtomValue(double)).toBe(20);
    setAtomValue(count, 15);
    expect(getAtomValue(double)).toBe(30);

    unsub();
  });

  it('should notify listeners when computed value changes', () => {
    const count = zen(10); // Use zen
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const double = computed([count as any], (value: unknown) => (value as number) * 2); // Use computed, accept unknown, cast inside
    const listener = vi.fn();

    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubscribe = subscribeToAtom(double as any, listener); // Use subscribeToAtom, add cast
    // Initial call happens, store the value for comparison
    const initialValue = getAtomValue(double); // Should be 20
    listener.mockClear(); // Reset after subscription

    // Test updates
    setAtomValue(count, 15);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(30, initialValue); // Pass initialValue as oldValue

    unsubscribe();
  });

  it('should not notify listeners if computed value does not change', () => {
    const count = zen(10); // Use zen
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const parity = computed([count as any], (value: unknown) =>
      (value as number) % 2 === 0 ? 'even' : 'odd',
    ); // Use computed, accept unknown, cast inside
    const listener = vi.fn();

    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubscribe = subscribeToAtom(parity as any, listener); // Use subscribeToAtom, add cast
    listener.mockClear(); // Clear call history after subscription

    setAtomValue(count, 12); // Value changes, but computed result ('even') does not
    expect(getAtomValue(parity)).toBe('even');
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('should handle multiple dependencies', () => {
    const num1 = zen(10); // Use zen
    const num2 = zen(5); // Use zen
    const sum = computed(
      // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
      [num1 as any, num2 as any],
      (n1: unknown, n2: unknown) => (n1 as number) + (n2 as number),
    ); // Use computed, accept unknown, cast inside
    const listener = vi.fn();

    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubscribe = subscribeToAtom(sum as any, listener); // Use subscribeToAtom, add cast
    const initialSum = getAtomValue(sum); // 15
    listener.mockClear(); // Clear after subscription

    setAtomValue(num1, 20); // sum changes from 15 to 25
    expect(getAtomValue(sum)).toBe(25);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(25, initialSum);
    listener.mockClear();

    const intermediateSum = getAtomValue(sum); // 25
    setAtomValue(num2, 7); // sum changes from 25 to 27
    expect(getAtomValue(sum)).toBe(27);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(27, intermediateSum);

    unsubscribe();
  });

  it('should handle dependencies on other computed atoms', () => {
    const base = zen(10); // Use zen
    // Ensure null check is present, accept unknown, cast inside
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const double = computed([base as any], (val: unknown) => ((val as number | null) ?? 0) * 2);
    const quadruple = computed(
      // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
      [double as any],
      (val: unknown) => ((val as number | null) ?? 0) * 2,
    );
    const listener = vi.fn();

    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubscribe = subscribeToAtom(quadruple as any, listener); // Use subscribeToAtom, add cast
    const initialQuad = getAtomValue(quadruple); // 40
    listener.mockClear(); // Clear after subscription

    setAtomValue(base, 5);
    expect(getAtomValue(quadruple)).toBe(20); // 5 * 2 * 2
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(20, initialQuad);

    unsubscribe();
  });

  it('should unsubscribe from dependencies when last listener unsubscribes', () => {
    const dep1 = zen(1); // Use zen
    const dep2 = zen(2); // Use zen
    const computedSum = computed(
      // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
      [dep1 as any, dep2 as any],
      (d1: unknown, d2: unknown) => (d1 as number) + (d2 as number),
    ); // Use computed, accept unknown, cast inside
    const listener = vi.fn();

    // Cast to access internal properties for testing
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const internalComputed = computedSum as any;

    // Initially, no unsubscribers
    expect(internalComputed._unsubscribers).toBeUndefined();

    // First subscribe triggers dependency subscriptions, add cast
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsub1 = subscribeToAtom(computedSum as any, listener); // Use subscribeToAtom
    expect(internalComputed._unsubscribers).toBeInstanceOf(Array);
    expect(internalComputed._unsubscribers.length).toBe(2); // Should have subscribed to both deps

    // Add a second listener - should NOT change unsubscribers array, add cast
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsub2 = subscribeToAtom(computedSum as any, () => {}); // Use subscribeToAtom
    expect(internalComputed._unsubscribers).toBeInstanceOf(Array);
    expect(internalComputed._unsubscribers.length).toBe(2);

    // Unsubscribe the second listener - should NOT unsubscribe from dependencies
    unsub2();
    expect(internalComputed._unsubscribers).toBeInstanceOf(Array); // Still subscribed

    // Unsubscribe the first (last) listener - should trigger unsubscribe from dependencies
    unsub1();
    expect(internalComputed._unsubscribers).toBeUndefined(); // Should be cleaned up
  });
});
