// Removed import { batch as zenBatch } from './batch';
import { atom as nanoAtom } from 'nanostores';
import { bench, describe } from 'vitest';
import { batch, set, subscribe, zen } from './zen'; // Import functional API including batch

describe('Batch vs Sequential Sets (No Listeners) (functional)', () => {
  describe('2 Sets', () => {
    bench('zen batch', () => {
      const $a = zen(0);
      const $b = zen(0);
      batch(() => {
        set($a, 1); // Use functional API
        set($b, 1);
      });
    });

    bench('nanostores sequential', () => {
      const $a = nanoAtom(0);
      const $b = nanoAtom(0);
      $a.set(1);
      $b.set(1);
    });
  });

  describe('5 Sets', () => {
    bench('zen batch', () => {
      const $a = zen(0);
      const $b = zen(0);
      const $c = zen(0);
      const $d = zen(0);
      const $e = zen(0);
      batch(() => {
        set($a, 1);
        set($b, 1);
        set($c, 1);
        set($d, 1);
        set($e, 1);
      });
    });

    bench('nanostores sequential', () => {
      const $a = nanoAtom(0);
      const $b = nanoAtom(0);
      const $c = nanoAtom(0);
      const $d = nanoAtom(0);
      const $e = nanoAtom(0);
      $a.set(1);
      $b.set(1);
      $c.set(1);
      $d.set(1);
      $e.set(1);
    });
  });

  describe('10 Sets', () => {
    bench('zen batch', () => {
      const atoms = Array.from({ length: 10 }, () => zen(0));
      batch(() => {
        for (const $a of atoms) {
          set($a, 1); // Use functional API
        }
      });
    });

    bench('nanostores sequential', () => {
      const atoms = Array.from({ length: 10 }, () => nanoAtom(0));
      for (const $a of atoms) {
        $a.set(1);
      }
    });
  });
});

describe('Batch vs Sequential Sets (With 1 Listener Each) (functional)', () => {
  describe('2 Sets', () => {
    bench('zen batch', () => {
      const $a = zen(0);
      const $b = zen(0);
      // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
      subscribe($a as any, () => {}); // Use functional API, add cast
      // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
      subscribe($b as any, () => {}); // Add cast
      batch(() => {
        set($a, 1);
        set($b, 1);
      });
    });

    bench('nanostores sequential', () => {
      const $a = nanoAtom(0);
      const $b = nanoAtom(0);
      $a.subscribe(() => {});
      $b.subscribe(() => {});
      $a.set(1);
      $b.set(1);
    });
  });

  describe('5 Sets', () => {
    bench('zen batch', () => {
      const atoms = Array.from({ length: 5 }, () => zen(0));
      for (const $a of atoms) {
        // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
        subscribe($a as any, () => {});
      } // Use for...of and functional API, add cast
      batch(() => {
        for (const $a of atoms) {
          set($a, 1);
        }
      });
    });

    bench('nanostores sequential', () => {
      const atoms = Array.from({ length: 5 }, () => nanoAtom(0));
      for (const $a of atoms) {
        $a.subscribe(() => {});
      } // Use for...of
      for (const $a of atoms) {
        $a.set(1);
      }
    });
  });

  describe('10 Sets', () => {
    bench('zen batch', () => {
      const atoms = Array.from({ length: 10 }, () => zen(0));
      for (const $a of atoms) {
        // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
        subscribe($a as any, () => {});
      } // Use for...of and functional API, add cast
      batch(() => {
        for (const $a of atoms) {
          set($a, 1);
        }
      });
    });

    bench('nanostores sequential', () => {
      const atoms = Array.from({ length: 10 }, () => nanoAtom(0));
      for (const $a of atoms) {
        $a.subscribe(() => {});
      } // Use for...of
      for (const $a of atoms) {
        $a.set(1);
      }
    });
  });
});

// Nested batching doesn't have a direct nanostores equivalent, keep separate
describe('Zen Nested Batching (functional)', () => {
  bench('zen nested batch 3 sets total', () => {
    const $a = zen(0);
    const $b = zen(0);
    const $c = zen(0);
    batch(() => {
      set($a, 1);
      batch(() => {
        set($b, 1);
      });
      set($c, 1);
    });
  });
});
