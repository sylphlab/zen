import { describe, it, expect, vi, afterEach } from 'vitest';
import { atom } from './atom'; // Assuming atom is exported from atom.ts
import { computed } from './computed'; // Assuming computed is exported from computed.ts

describe('computed', () => {
  // Clear mocks after each test in this suite
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should compute initial value correctly', () => {
    const count = atom(10);
    const double = computed([count], value => value * 2);
    expect(double.get()).toBe(20);
    // expect(double.value).toBe(20); // Avoid testing internal implementation details
  });

  it('should update when a dependency atom changes', () => {
    const count = atom(10);
    const double = computed([count], value => value * 2);

    // Subscribe to activate dependency tracking
    const unsub = double.subscribe(() => {});

    expect(double.get()).toBe(20);
    count.set(15);
    expect(double.get()).toBe(30);

    unsub();
  });

  it('should notify listeners when computed value changes', () => {
    const count = atom(10);
    const double = computed([count], value => value * 2);
    const listener = vi.fn();

    const unsubscribe = double.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1); // Initial call
    expect(listener).toHaveBeenCalledWith(20, undefined); // Add undefined oldValue

    listener.mockClear();
    count.set(15);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(30, 20); // Add oldValue 20

    unsubscribe();
  });

  it('should not notify listeners if computed value does not change', () => {
    const count = atom(10);
    const parity = computed([count], value => (value % 2 === 0 ? 'even' : 'odd'));
    const listener = vi.fn();

    const unsubscribe = parity.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1); // Initial call ('even')
    listener.mockClear();

    count.set(12); // Value changes, but computed result ('even') does not
    expect(parity.get()).toBe('even');
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('should handle multiple dependencies', () => {
    const num1 = atom(10);
    const num2 = atom(5);
    const sum = computed([num1, num2], (n1, n2) => n1 + n2);
    const listener = vi.fn();

    const unsubscribe = sum.subscribe(listener);
    expect(sum.get()).toBe(15);
    expect(listener).toHaveBeenCalledTimes(1); // Initial call
    listener.mockClear();

    num1.set(20); // sum changes from 15 to 25
    expect(sum.get()).toBe(25);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(25, 15); // Add oldValue 15
    listener.mockClear();

    num2.set(7); // sum changes from 25 to 27
    expect(sum.get()).toBe(27);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(27, 25); // Add oldValue 25

    unsubscribe();
  });

  it('should handle dependencies on other computed atoms', () => {
      const base = atom(10);
      const double = computed([base], val => val * 2);
      const quadruple = computed([double], val => val * 2);
      const listener = vi.fn();

      const unsubscribe = quadruple.subscribe(listener);
      expect(quadruple.get()).toBe(40); // 10 * 2 * 2
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(40, undefined); // Initial call
      listener.mockClear();

      base.set(5);
      expect(quadruple.get()).toBe(20); // 5 * 2 * 2
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(20, 40); // Add oldValue 40

      unsubscribe();
  });

  it('should unsubscribe from dependencies when last listener unsubscribes', () => {
    const dep1 = atom(1);
    const dep2 = atom(2);

    // Create spies for the original unsubscribe functions FIRST
    const dep1UnsubSpy = vi.fn();
    const dep2UnsubSpy = vi.fn();

    // Spy on subscribe, simply make it return our unsubscribe spy.
    // The original subscribe logic will still run internally when computed calls it.
    const dep1SubscribeSpy = vi.spyOn(dep1, 'subscribe').mockReturnValue(dep1UnsubSpy);
    const dep2SubscribeSpy = vi.spyOn(dep2, 'subscribe').mockReturnValue(dep2UnsubSpy);

    const computedSum = computed([dep1, dep2], (d1, d2) => d1 + d2);
    const listener = vi.fn();

    // First subscribe triggers dependency subscriptions
    const unsub1 = computedSum.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1); // Initial call
    expect(dep1SubscribeSpy).toHaveBeenCalledTimes(1);
    expect(dep2SubscribeSpy).toHaveBeenCalledTimes(1);
    expect(dep1UnsubSpy).not.toHaveBeenCalled();
    expect(dep2UnsubSpy).not.toHaveBeenCalled();


    // Add a second listener - should NOT re-trigger dependency subscriptions
    dep1SubscribeSpy.mockClear();
    dep2SubscribeSpy.mockClear();
    const unsub2 = computedSum.subscribe(() => {});
    expect(dep1SubscribeSpy).not.toHaveBeenCalled();
    expect(dep2SubscribeSpy).not.toHaveBeenCalled();
    expect(dep1UnsubSpy).not.toHaveBeenCalled();
    expect(dep2UnsubSpy).not.toHaveBeenCalled();

    // Unsubscribe the second listener - should NOT unsubscribe from dependencies
    unsub2();
    expect(dep1UnsubSpy).not.toHaveBeenCalled();
    expect(dep2UnsubSpy).not.toHaveBeenCalled();

    // Unsubscribe the first (last) listener - should trigger calls to our spies
    unsub1();
    expect(dep1UnsubSpy).toHaveBeenCalledTimes(1);
    expect(dep2UnsubSpy).toHaveBeenCalledTimes(1);

    // Restore mocks is handled by afterEach
  });
});
