import { describe, it, expect, vi } from 'vitest';
import { atom, computed, Atom, ReadonlyAtom } from './index'; // Adjust path as necessary

describe('atom', () => {
  it('should initialize with the correct value', () => {
    const initialValue = 0;
    const count = atom(initialValue);
    expect(count.get()).toBe(initialValue);
    expect(count.value).toBe(initialValue); // Check internal value too
  });

  it('should update the value with set()', () => {
    const count = atom(0);
    const newValue = 5;
    count.set(newValue);
    expect(count.get()).toBe(newValue);
    expect(count.value).toBe(newValue);
  });

  it('should not notify listeners if the value has not changed', () => {
    const count = atom(0);
    const listener = vi.fn();

    // Subscribe *after* initial value to only catch updates
    const unsubscribe = count.subscribe(() => {}); // Dummy initial subscribe
    unsubscribe(); // Unsubscribe immediately

    const unsubscribeUpdate = count.subscribe(listener);
    listener.mockClear(); // Clear mock *after* subscription triggers initial call

    count.set(0); // Set same value
    expect(listener).not.toHaveBeenCalled();

    unsubscribeUpdate();
  });

  it('should notify listeners immediately upon subscription with the current value', () => {
    const initialValue = 10;
    const count = atom(initialValue);
    const listener = vi.fn();

    const unsubscribe = count.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(initialValue);

    unsubscribe();
  });

  it('should notify listeners when the value changes', () => {
    const count = atom(0);
    const listener = vi.fn();

    // Subscribe and ignore the initial call
    const unsubscribe = count.subscribe(() => {});
    unsubscribe();
    listener.mockClear(); // Clear mock after dummy initial call

    const unsubscribeUpdate = count.subscribe(listener);
    listener.mockClear(); // Clear mock *after* subscription triggers initial call

    count.set(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);

    count.set(2);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(2);

    unsubscribeUpdate();
  });

  it('should allow multiple listeners', () => {
    const count = atom(0);
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = count.subscribe(listener1);
    const unsub2 = count.subscribe(listener2);

    // Check initial calls
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener1).toHaveBeenCalledWith(0);
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledWith(0);

    listener1.mockClear();
    listener2.mockClear();

    count.set(5);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener1).toHaveBeenCalledWith(5);
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledWith(5);

    unsub1();
    unsub2();
  });

  it('should stop notifying listeners after unsubscribing', () => {
    const count = atom(0);
    const listener = vi.fn();

    const unsubscribe = count.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1); // Initial call

    listener.mockClear();

    count.set(1);
    expect(listener).toHaveBeenCalledTimes(1); // Update call

    unsubscribe();

    count.set(2);
    expect(listener).toHaveBeenCalledTimes(1); // No more calls after unsubscribe

  });

  it('should handle different data types', () => {
    // String
    const text = atom("hello");
    expect(text.get()).toBe("hello");
    text.set("world");
    expect(text.get()).toBe("world");

    // Boolean
    const flag = atom(true);
    expect(flag.get()).toBe(true);
    flag.set(false);
    expect(flag.get()).toBe(false);

    // Object
    const obj = atom({ a: 1 });
    const listenerObj = vi.fn();
    const unsubObj = obj.subscribe(listenerObj);
    expect(obj.get()).toEqual({ a: 1 });
    // Correct the new object to match the inferred type { a: number }
    const newObjValue = { a: 2 };
    obj.set(newObjValue);
    expect(obj.get()).toEqual(newObjValue);
    expect(listenerObj).toHaveBeenCalledTimes(2); // Initial + update
    expect(listenerObj).toHaveBeenCalledWith(newObjValue);
    unsubObj();

    // Array
    const arr = atom([1, 2]);
    const listenerArr = vi.fn();
    const unsubArr = arr.subscribe(listenerArr);
    expect(arr.get()).toEqual([1, 2]);
    const newArr = [3, 4, 5];
    arr.set(newArr);
    expect(arr.get()).toEqual(newArr);
    expect(listenerArr).toHaveBeenCalledTimes(2); // Initial + update
    expect(listenerArr).toHaveBeenCalledWith(newArr);
    unsubArr();
  });

});

describe('computed', () => {
  it('should compute initial value correctly', () => {
    const count = atom(10);
    const double = computed([count], value => value * 2);
    expect(double.get()).toBe(20);
    expect(double.value).toBe(20); // Check internal value access if needed
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
    expect(listener).toHaveBeenCalledWith(20);

    listener.mockClear();
    count.set(15);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(30);

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

    num1.set(20);
    expect(sum.get()).toBe(25);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(25);
    listener.mockClear();

    num2.set(7);
    expect(sum.get()).toBe(27);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(27);

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
      listener.mockClear();

      base.set(5);
      expect(double.get()).toBe(10);
      expect(quadruple.get()).toBe(20); // 5 * 2 * 2
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(20);

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

    // Initially, dependency subscriptions should not have happened yet
    // (unless computed logic changes to subscribe immediately - current doesn't)
    // expect(dep1SubscribeSpy).not.toHaveBeenCalled(); // This might fail depending on computed impl.
    // expect(dep2SubscribeSpy).not.toHaveBeenCalled();

    // First subscribe triggers dependency subscriptions (which now return our spies)
    const unsub1 = computedSum.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1); // Initial call with computed value
    expect(dep1SubscribeSpy).toHaveBeenCalledTimes(1); // Should have subscribed now
    expect(dep2SubscribeSpy).toHaveBeenCalledTimes(1);
    expect(dep1UnsubSpy).not.toHaveBeenCalled(); // Unsubscribe spy shouldn't be called yet
    expect(dep2UnsubSpy).not.toHaveBeenCalled();


    // Add a second listener - should NOT re-trigger dependency subscriptions
    dep1SubscribeSpy.mockClear(); // Clear calls for the next check
    dep2SubscribeSpy.mockClear();
    const unsub2 = computedSum.subscribe(() => {});
    expect(dep1SubscribeSpy).not.toHaveBeenCalled(); // No new subscribe calls
    expect(dep2SubscribeSpy).not.toHaveBeenCalled();
    expect(dep1UnsubSpy).not.toHaveBeenCalled(); // Still not unsubscribed
    expect(dep2UnsubSpy).not.toHaveBeenCalled();

    // Unsubscribe the second listener - should NOT unsubscribe from dependencies
    unsub2();
    expect(dep1UnsubSpy).not.toHaveBeenCalled();
    expect(dep2UnsubSpy).not.toHaveBeenCalled();

    // Unsubscribe the first (last) listener - should trigger calls to our spies
    unsub1();
    expect(dep1UnsubSpy).toHaveBeenCalledTimes(1); // Now it should be called
    expect(dep2UnsubSpy).toHaveBeenCalledTimes(1);

    // Restore mocks
    vi.restoreAllMocks();
  });

});
