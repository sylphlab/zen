import { bench, describe } from 'vitest';
import { atom as zenAtom, set as zenSetAtomValue, subscribe as zenSubscribeToAtom, batch as zenBatch } from './atom'; // Import functional API including batch
// Removed import { batch as zenBatch } from './batch';
import { atom as nanoAtom } from 'nanostores';
describe('Batch vs Sequential Sets (No Listeners) (functional)', () => {
    describe('2 Sets', () => {
        bench('zen batch', () => {
            const $a = zenAtom(0);
            const $b = zenAtom(0);
            zenBatch(() => {
                zenSetAtomValue($a, 1); // Use functional API
                zenSetAtomValue($b, 1);
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
            const $a = zenAtom(0);
            const $b = zenAtom(0);
            const $c = zenAtom(0);
            const $d = zenAtom(0);
            const $e = zenAtom(0);
            zenBatch(() => {
                zenSetAtomValue($a, 1);
                zenSetAtomValue($b, 1);
                zenSetAtomValue($c, 1);
                zenSetAtomValue($d, 1);
                zenSetAtomValue($e, 1);
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
            const atoms = Array.from({ length: 10 }, () => zenAtom(0));
            zenBatch(() => {
                for (const $a of atoms) {
                    zenSetAtomValue($a, 1); // Use functional API
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
            const $a = zenAtom(0);
            const $b = zenAtom(0);
            zenSubscribeToAtom($a, () => { }); // Use functional API, add cast
            zenSubscribeToAtom($b, () => { }); // Add cast
            zenBatch(() => {
                zenSetAtomValue($a, 1);
                zenSetAtomValue($b, 1);
            });
        });
        bench('nanostores sequential', () => {
            const $a = nanoAtom(0);
            const $b = nanoAtom(0);
            $a.subscribe(() => { });
            $b.subscribe(() => { });
            $a.set(1);
            $b.set(1);
        });
    });
    describe('5 Sets', () => {
        bench('zen batch', () => {
            const atoms = Array.from({ length: 5 }, () => zenAtom(0));
            atoms.forEach($a => zenSubscribeToAtom($a, () => { })); // Use functional API, add cast
            zenBatch(() => {
                for (const $a of atoms) {
                    zenSetAtomValue($a, 1);
                }
            });
        });
        bench('nanostores sequential', () => {
            const atoms = Array.from({ length: 5 }, () => nanoAtom(0));
            atoms.forEach($a => $a.subscribe(() => { }));
            for (const $a of atoms) {
                $a.set(1);
            }
        });
    });
    describe('10 Sets', () => {
        bench('zen batch', () => {
            const atoms = Array.from({ length: 10 }, () => zenAtom(0));
            atoms.forEach($a => zenSubscribeToAtom($a, () => { })); // Use functional API, add cast
            zenBatch(() => {
                for (const $a of atoms) {
                    zenSetAtomValue($a, 1);
                }
            });
        });
        bench('nanostores sequential', () => {
            const atoms = Array.from({ length: 10 }, () => nanoAtom(0));
            atoms.forEach($a => $a.subscribe(() => { }));
            for (const $a of atoms) {
                $a.set(1);
            }
        });
    });
});
// Nested batching doesn't have a direct nanostores equivalent, keep separate
describe('Zen Nested Batching (functional)', () => {
    bench('zen nested batch 3 sets total', () => {
        const $a = zenAtom(0);
        const $b = zenAtom(0);
        const $c = zenAtom(0);
        zenBatch(() => {
            zenSetAtomValue($a, 1);
            zenBatch(() => {
                zenSetAtomValue($b, 1);
            });
            zenSetAtomValue($c, 1);
        });
    });
});
