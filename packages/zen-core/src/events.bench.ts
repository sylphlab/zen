import { atom as nanoAtom, computed as nanoComputed, map as nanoMap } from 'nanostores';
import { onStart as nanoOnStart, onStop as nanoOnStop } from 'nanostores';
import { bench, describe } from 'vitest';
import { computed } from './computed'; // Use computed
import { deepMap, setPath as setDeepMapPath } from './deepMap'; // Use deepMap
import { onMount, onNotify, onSet, onStart, onStop } from './events'; // Use default names
import { map, setKey as setMapKey } from './map'; // Use map
import { set as setAtom, subscribe, zen } from './zen'; // Use zen, subscribe

describe('onStart/onStop Overhead (Atom)', () => {
  bench('zen', () => {
    const $a = zen(0); // Use zen factory
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubStart = onStart($a as any, () => {}); // Add cast back
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubStop = onStop($a as any, () => {}); // Add cast back
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsub = subscribe($a as any, () => {}); // Use subscribe, add cast back
    unsub();
    unsubStart();
    unsubStop();
  });

  bench('nanostores', () => {
    const $a = nanoAtom(0);
    const unsubStart = nanoOnStart($a, () => {});
    const unsubStop = nanoOnStop($a, () => {});
    const unsub = $a.subscribe(() => {});
    unsub();
    unsubStart();
    unsubStop();
  });
});

describe('onStart/onStop Overhead (Computed)', () => {
  bench('zen', () => {
    const $a = zen(0); // Use zen factory
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const $c = computed([$a as any], (a: unknown) => a as number); // Use computed, add cast back, fix signature
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubStart = onStart($c as any, () => {}); // Add cast back
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubStop = onStop($c as any, () => {}); // Add cast back
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsub = subscribe($c as any, () => {}); // Use subscribe, add cast back
    unsub();
    unsubStart();
    unsubStop();
  });

  bench('nanostores', () => {
    const $a = nanoAtom(0);
    const $c = nanoComputed($a, (a) => a); // Nanostores computed takes single atom
    const unsubStart = nanoOnStart($c, () => {});
    const unsubStop = nanoOnStop($c, () => {});
    const unsub = $c.subscribe(() => {});
    unsub();
    unsubStart();
    unsubStop();
  });
});

describe('onStart/onStop Overhead (Map)', () => {
  bench('zen', () => {
    const $m = map({}); // Use map factory
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubStart = onStart($m as any, () => {}); // Add cast back
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubStop = onStop($m as any, () => {}); // Add cast back
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsub = subscribe($m as any, () => {}); // Use subscribe, add cast back
    unsub();
    unsubStart();
    unsubStop();
  });

  bench('nanostores', () => {
    const $m = nanoMap({});
    const unsubStart = nanoOnStart($m, () => {});
    const unsubStop = nanoOnStop($m, () => {});
    const unsub = $m.subscribe(() => {});
    unsub();
    unsubStart();
    unsubStop();
  });
});

// Nanostores doesn't have deepMap equivalent for direct comparison
describe('onStart/onStop Overhead (DeepMap - Zen only)', () => {
  bench('zen', () => {
    const $dm = deepMap({}); // Use deepMap factory
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubStart = onStart($dm as any, () => {}); // Add cast back
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubStop = onStop($dm as any, () => {}); // Add cast back
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsub = subscribe($dm as any, () => {}); // Use subscribe, add cast back
    unsub();
    unsubStart();
    unsubStop();
  });
});

// --- onSet / onNotify / onMount (Zen only) ---
describe('Zen Specific Event Overheads', () => {
  bench('zen onSet overhead (atom)', () => {
    const $a = zen(0); // Use zen factory
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubSet = onSet($a as any, () => {}); // Add cast back
    setAtom($a, 1);
    unsubSet();
  });

  bench('zen onSet overhead (map)', () => {
    const $m = map<{ a?: number }>({}); // Use map factory
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubSet = onSet($m as any, () => {}); // Add cast back
    setMapKey($m, 'a', 1);
    unsubSet();
  });

  bench('zen onSet overhead (deepMap)', () => {
    const $dm = deepMap<{ a?: number }>({}); // Use deepMap factory
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubSet = onSet($dm as any, () => {}); // Add cast back
    setDeepMapPath($dm, 'a', 1);
    unsubSet();
  });

  bench('zen onNotify overhead (atom)', () => {
    const $a = zen(0); // Use zen factory
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubNotify = onNotify($a as any, () => {}); // Add cast back
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    subscribe($a as any, () => {}); // Need a subscriber to trigger notify, use subscribe, add cast back
    setAtom($a, 1);
    unsubNotify();
  });

  bench('zen onNotify overhead (computed)', () => {
    const $a = zen(0); // Use zen factory
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const $c = computed([$a as any], (a: unknown) => a as number); // Use computed, add cast back, fix signature
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubNotify = onNotify($c as any, () => {}); // Add cast back
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    subscribe($c as any, () => {}); // Need a subscriber to trigger notify, use subscribe, add cast back
    setAtom($a, 1); // Trigger computed update
    unsubNotify();
  });

  bench('zen onMount overhead (atom)', () => {
    const $a = zen(0); // Use zen factory
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    const unsubMount = onMount($a as any, () => {}); // Use onMount, Called immediately, add cast back
    unsubMount();
  });
});
