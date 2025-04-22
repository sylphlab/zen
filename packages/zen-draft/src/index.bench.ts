// Import zen atom factory
import { atom } from '@sylphlab/zen-core';
// Import immer for comparison
import { produce as immerProduce } from 'immer';
import { bench, describe, vi } from 'vitest'; // Import vi for potential mocking if needed
import { produce, produceAtom } from './index';

// --- produce Benchmarks ---

describe('produce: Simple Object Replace', () => {
  const base = { value: 1 };
  bench('zen-draft', () => {
    produce(base, (draft) => {
      draft.value = 2;
    });
  });

  if (typeof immerProduce === 'function') {
    bench('immer', () => {
      immerProduce(base, (draft) => {
        draft.value = 2;
      });
    });
  }
});

describe('produce: Nested Object Replace', () => {
  const base = { a: { b: { c: 1 } } };
  bench('zen-draft', () => {
    produce(base, (draft) => {
      draft.a.b.c = 2;
    });
  });

  if (typeof immerProduce === 'function') {
    bench('immer', () => {
      immerProduce(base, (draft) => {
        draft.a.b.c = 2;
      });
    });
  }
});

describe('produce: Array Push (Small)', () => {
  const base = { items: [1, 2, 3] };
  bench('zen-draft', () => {
    produce(base, (draft) => {
      draft.items.push(4);
    });
  });

  if (typeof immerProduce === 'function') {
    bench('immer', () => {
      immerProduce(base, (draft) => {
        draft.items.push(4);
      });
    });
  }
});

describe('produce: Array Push (Large)', () => {
  const largeArrayBase = { items: Array.from({ length: 1000 }, (_, i) => i) };
  bench('zen-draft', () => {
    // Create a fresh copy for each run to avoid mutation across runs
    const currentBase = { items: [...largeArrayBase.items] };
    produce(currentBase, (draft) => {
      draft.items.push(1000);
    });
  });

  if (typeof immerProduce === 'function') {
    bench('immer', () => {
      // Create a fresh copy for each run
      const currentBase = { items: [...largeArrayBase.items] };
      immerProduce(currentBase, (draft) => {
        draft.items.push(1000);
      });
    });
  }
});

describe('produce: Array Splice (Large)', () => {
  const largeArrayBase = { items: Array.from({ length: 1000 }, (_, i) => i) };
  bench('zen-draft', () => {
    const currentBase = { items: [...largeArrayBase.items] };
    produce(currentBase, (draft) => {
      draft.items.splice(500, 1, -1); // Replace one item in the middle
    });
  });

  if (typeof immerProduce === 'function') {
    bench('immer', () => {
      const currentBase = { items: [...largeArrayBase.items] };
      immerProduce(currentBase, (draft) => {
        draft.items.splice(500, 1, -1);
      });
    });
  }
});

describe('produce: Map Set (Add/Replace)', () => {
  const createMapBase = () => ({
    data: new Map(Array.from({ length: 100 }, (_, i) => [`key${i}`, i])),
  });
  bench('zen-draft', () => {
    const currentBase = createMapBase();
    produce(currentBase, (draft) => {
      draft.data.set('key50', -1); // Replace
      draft.data.set('newKey', 1000); // Add
    });
  });

  if (typeof immerProduce === 'function') {
    bench('immer', () => {
      const currentBase = createMapBase();
      immerProduce(currentBase, (draft) => {
        draft.data.set('key50', -1);
        draft.data.set('newKey', 1000);
      });
    });
  }
});

describe('produce: Map Delete', () => {
  const createMapBase = () => ({
    data: new Map(Array.from({ length: 100 }, (_, i) => [`key${i}`, i])),
  });
  bench('zen-draft', () => {
    const currentBase = createMapBase();
    produce(currentBase, (draft) => {
      draft.data.delete('key50');
    });
  });
  if (typeof immerProduce === 'function') {
    bench('immer', () => {
      const currentBase = createMapBase();
      immerProduce(currentBase, (draft) => {
        draft.data.delete('key50');
      });
    });
  }
});

describe('produce: Map Clear', () => {
  const createMapBase = () => ({
    data: new Map(Array.from({ length: 100 }, (_, i) => [`key${i}`, i])),
  });
  bench('zen-draft', () => {
    const currentBase = createMapBase();
    produce(currentBase, (draft) => {
      draft.data.clear();
    });
  });
  if (typeof immerProduce === 'function') {
    bench('immer', () => {
      const currentBase = createMapBase();
      immerProduce(currentBase, (draft) => {
        draft.data.clear();
      });
    });
  }
});

describe('produce: Set Add', () => {
  const createSetBase = () => ({
    data: new Set(Array.from({ length: 100 }, (_, i) => `item${i}`)),
  });
  bench('zen-draft', () => {
    const currentBase = createSetBase();
    produce(currentBase, (draft) => {
      draft.data.add('newItem');
    });
  });

  if (typeof immerProduce === 'function') {
    bench('immer', () => {
      const currentBase = createSetBase();
      immerProduce(currentBase, (draft) => {
        draft.data.add('newItem');
      });
    });
  }
});

describe('produce: Set Delete', () => {
  const createSetBase = () => ({
    data: new Set(Array.from({ length: 100 }, (_, i) => `item${i}`)),
  });
  bench('zen-draft', () => {
    const currentBase = createSetBase();
    produce(currentBase, (draft) => {
      draft.data.delete('item50');
    });
  });
  if (typeof immerProduce === 'function') {
    bench('immer', () => {
      const currentBase = createSetBase();
      immerProduce(currentBase, (draft) => {
        draft.data.delete('item50');
      });
    });
  }
});

describe('produce: Set Clear', () => {
  const createSetBase = () => ({
    data: new Set(Array.from({ length: 100 }, (_, i) => `item${i}`)),
  });
  bench('zen-draft', () => {
    const currentBase = createSetBase();
    produce(currentBase, (draft) => {
      draft.data.clear();
    });
  });
  if (typeof immerProduce === 'function') {
    bench('immer', () => {
      const currentBase = createSetBase();
      immerProduce(currentBase, (draft) => {
        draft.data.clear();
      });
    });
  }
});

// --- produceAtom Benchmarks ---

describe('produceAtom: Simple Object Replace', () => {
  const createBaseAtom = () => atom({ value: 1 });
  bench('zen-draft + atom', () => {
    const myZen = createBaseAtom();
    produceAtom(myZen, (draft) => {
      draft.value = 2;
    });
  });
});

describe('produceAtom: Nested Object Replace', () => {
  const createBaseAtom = () => atom({ a: { b: { c: 1 } } });
  bench('zen-draft + atom', () => {
    const myZen = createBaseAtom();
    produceAtom(myZen, (draft) => {
      draft.a.b.c = 2;
    });
  });
});

describe('produceAtom: Array Push (Small)', () => {
  const createBaseAtom = () => atom({ items: [1, 2, 3] });
  bench('zen-draft + atom', () => {
    const myZen = createBaseAtom();
    produceAtom(myZen, (draft) => {
      draft.items.push(4);
    });
  });
});

describe('produceAtom: Array Push (Large)', () => {
  const createLargeArrayBaseAtom = () => atom({ items: Array.from({ length: 1000 }, (_, i) => i) });
  bench('zen-draft + atom', () => {
    // Create atom inside bench for fair comparison if needed, though setup cost is usually excluded
    const myZen = createLargeArrayBaseAtom();
    produceAtom(myZen, (draft) => {
      draft.items.push(1000);
    });
  });
});

// Add more produceAtom benchmarks for splice, map, set etc. if needed
