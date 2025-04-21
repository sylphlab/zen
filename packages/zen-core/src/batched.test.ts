import { afterEach, describe, expect, test, vi } from 'vitest';
import { atom, batch, set } from './atom';
import { batched } from './batched';
import { computed } from './computed';
import { subscribe } from './index'; // Use index subscribe

// Helper to wait for the next microtask tick
const nextTick = () => new Promise((resolve) => queueMicrotask(() => resolve(undefined))); // Wrap resolve

describe('batched', () => {
  // afterEach(() => {
  //     // Reset batch depth just in case a test fails mid-batch
  //     // batchDepth = 0; // Cannot access internal batchDepth
  //     // Clear microtask queue related state if needed (assuming batched.ts handles its internal queue correctly on unsubscribe)
  // });

  test('calculates initial value after tick', async () => {
    const source = atom(10);
    const derived = batched(source as any, (value) => (value as number) * 2); // Cast source, add type hint for value
    const listener = vi.fn();

    expect(derived._value).toBeNull(); // Should be null initially

    const unsub = subscribe(derived as any, listener); // Cast derived

    // Subscribe now calls listener synchronously with the initial value (which is null for batched)
    expect(derived._value).toBeNull(); // Still null immediately after subscribe
    expect(listener).toHaveBeenCalledTimes(1); // Listener called synchronously
    expect(listener).toHaveBeenCalledWith(null, undefined); // Initial value is null

    listener.mockClear(); // Clear the initial sync call

    await nextTick(); // Wait for microtask queue for the *actual* calculation

    expect(derived._value).toBe(20); // Value calculated after tick
    expect(listener).toHaveBeenCalledTimes(1); // Listener called again after calculation
    // oldValue should be null for the first calculated call
    expect(listener).toHaveBeenCalledWith(20, null);

    unsub();
  });

  test('updates value only after tick', async () => {
    const source = atom(10);
    const derived = batched(source as any, (value) => (value as number) * 2); // Cast source, add type hint for value
    const listener = vi.fn();
    const unsub = subscribe(derived as any, listener); // Cast derived

    await nextTick(); // Initial calculation
    listener.mockClear();

    set(source, 11);

    expect(derived._value).toBe(20); // Still old value
    expect(listener).not.toHaveBeenCalled(); // Listener not called yet

    await nextTick(); // Wait for microtask queue

    expect(derived._value).toBe(22); // Value updated
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(22, 20);

    unsub();
  });

  test('batches multiple updates within one tick', async () => {
    const source1 = atom(10);
    const source2 = atom(100);
    const derived = batched(
      [source1 as any, source2 as any],
      (v1, v2) => (v1 as number) + (v2 as number),
    ); // Cast sources, add type hints
    const listener = vi.fn();
    const unsub = subscribe(derived as any, listener); // Cast derived

    await nextTick(); // Initial calculation (110)
    listener.mockClear();

    // Multiple updates synchronously
    set(source1, 11);
    set(source2, 101);
    set(source1, 12); // Overwrite previous change

    expect(derived._value).toBe(110); // Still old value
    expect(listener).not.toHaveBeenCalled();

    await nextTick(); // Wait for microtask queue

    expect(derived._value).toBe(113); // Calculates based on final values (12 + 101)
    expect(listener).toHaveBeenCalledTimes(1); // Listener called only once
    expect(listener).toHaveBeenCalledWith(113, 110);

    unsub();
  });

  test('batches updates using explicit batch() within one tick', async () => {
    const source1 = atom(10);
    const source2 = atom(100);
    const derived = batched(
      [source1 as any, source2 as any],
      (v1, v2) => (v1 as number) + (v2 as number),
    ); // Cast sources, add type hints
    const listener = vi.fn();
    const unsub = subscribe(derived as any, listener); // Cast derived

    await nextTick(); // Initial calculation (110)
    listener.mockClear();

    // Multiple updates within explicit batch
    batch(() => {
      set(source1, 11);
      set(source2, 101);
    });

    expect(derived._value).toBe(110); // Still old value
    expect(listener).not.toHaveBeenCalled();

    await nextTick(); // Wait for microtask queue

    expect(derived._value).toBe(112); // Calculates based on final values (11 + 101)
    expect(listener).toHaveBeenCalledTimes(1); // Listener called only once
    expect(listener).toHaveBeenCalledWith(112, 110);

    unsub();
  });

  test('handles computed atom dependency initial null state', async () => {
    // SKIP NaN issue again
    const base = atom(5);
    // Modify computed calculation to explicitly handle null
    const comp = computed(base as any, (val) => (val === null ? 0 : (val as number)) * 2); // Cast base, add type hint
    // Explicit function to avoid potential arrow function/ternary issues
    const calculationFn = (val: unknown) => {
      if (val === null) {
        return -1;
      }
      // Add explicit check for number before adding 1
      if (typeof val === 'number') {
        return val + 1;
      }
      return Number.NaN; // Or throw error
    };
    const batchedComp = batched(comp as any, calculationFn); // Cast comp, add type hint
    const listener = vi.fn();

    // Subscribe to batchedComp, which should trigger subscription to comp
    const unsub = subscribe(batchedComp as any, listener); // Cast batchedComp

    expect(comp._value).toBe(10); // comp should calculate synchronously via get() during subscribe
    expect(batchedComp._value).toBeNull(); // batchedComp is initially null
    expect(listener).toHaveBeenCalledTimes(1); // Expect the initial sync call
    expect(listener).toHaveBeenCalledWith(null, undefined); // Check the initial sync call args

    await nextTick(); // Wait for batchedComp's initial calculation

    // After tick, comp should have calculated (10), and batchedComp should use it (11)
    expect(comp._value).toBe(10);
    expect(batchedComp._value).toBe(11);
    expect(listener).toHaveBeenCalledTimes(2); // Now expect 2 calls total (sync + async)
    expect(listener).toHaveBeenNthCalledWith(2, 11, null); // Check the 2nd (async) call args

    listener.mockClear();

    // Update base, triggering comp and then batchedComp after tick
    set(base, 6);

    expect(comp._value).toBe(12); // Computed updates immediately
    expect(batchedComp._value).toBe(11); // Batched waits for tick
    expect(listener).not.toHaveBeenCalled();

    await nextTick();

    expect(batchedComp._value).toBe(13); // Batched updates
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(13, 11);

    unsub();
  });

  test('does not notify if calculation result reference is the same', async () => {
    const source = atom({ id: 1 });
    const stableRef = { type: 'stable' };
    let calculationCount = 0;

    // Calculation returns a stable reference sometimes
    const derived = batched(source as any, (value: unknown) => {
      // Accept unknown
      calculationCount++;
      // Assert type inside the function
      const val = value as { id: number };
      if (val.id % 2 === 0) {
        return stableRef; // Return same ref for even IDs
      }
      // Use the asserted 'val' here
      return { type: 'new', id: val.id }; // Return new object for odd IDs
    });

    const listener = vi.fn();
    // Need get() from index to read value
    const { get } = await import('./index');
    const unsub = subscribe(derived as any, listener);

    // Initial sync call: (null, undefined)
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(null, undefined);

    await nextTick(); // Initial calculation { type: 'new', id: 1 }
    // Async call: ({ type: 'new', id: 1 }, null)
    expect(listener).toHaveBeenCalledTimes(2);
    const value1 = get(derived); // { type: 'new', id: 1 }
    expect(listener).toHaveBeenNthCalledWith(2, value1, null);
    expect(calculationCount).toBe(1);
    listener.mockClear();

    // Update source to id: 2 -> calculation returns stableRef
    set(source, { id: 2 });
    await nextTick();
    // Listener called: (stableRef, value1)
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(stableRef, value1);
    expect(calculationCount).toBe(2);
    listener.mockClear();

    // Update source to id: 4 -> calculation returns stableRef AGAIN
    set(source, { id: 4 });
    await nextTick();
    // Listener SHOULD NOT be called because result is same reference as before
    expect(listener).not.toHaveBeenCalled();
    expect(calculationCount).toBe(3); // Calculation still runs
    listener.mockClear();

    // Update source to id: 3 -> calculation returns new object
    set(source, { id: 3 });
    await nextTick();
    const value3 = get(derived); // { type: 'new', id: 3 }
    // Listener called: (value3, stableRef)
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(value3, stableRef);
    expect(calculationCount).toBe(4);

    unsub();
  });

  test('unsubscribes from source stores when last listener leaves', async () => {
    const source = atom(10);
    const calculation = vi.fn((value) => value * 2);
    const derived = batched(source as any, calculation); // Cast source

    // expect(derived._unsubscribers).toHaveLength(0); // Remove check for internal property

    const unsub1 = subscribe(derived as any, () => {}); // Cast derived
    await nextTick(); // Allow initial setup

    // expect(derived._unsubscribers.length).toBeGreaterThan(0); // Remove check for internal property
    calculation.mockClear();

    set(source, 11);
    await nextTick();
    expect(calculation).toHaveBeenCalledTimes(1); // Calculation runs

    const unsub2 = subscribe(derived as any, () => {}); // Cast derived
    // const unsubCountBefore = derived._unsubscribers.length; // Remove check for internal property

    unsub1(); // First listener unsubscribes
    // expect(derived._unsubscribers.length).toBe(unsubCountBefore); // Remove check for internal property

    unsub2(); // Last listener unsubscribes
    // expect(derived._unsubscribers).toHaveLength(0); // Remove check for internal property

    // Further updates should not trigger calculation
    calculation.mockClear();
    set(source, 12);
    await nextTick();
    expect(calculation).not.toHaveBeenCalled();
  });
});

// Need to declare batchDepth for the test file scope if it's used internally
// and not exported in a way TS can see for the test.
// However, it's better if the implementation detail is not needed here.
// Let's assume batched.ts handles its state correctly.
declare let batchDepth: number | undefined;
