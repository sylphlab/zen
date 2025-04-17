import { bench, describe } from 'vitest';
import { atom, set as setAtom, subscribe } from './atom'; // Use atom, subscribe
import { computed } from './computed'; // Use computed
import { map, setKey as setMapKey } from './map'; // Use map
import { deepMap, setPath as setDeepMapPath } from './deepMap'; // Use deepMap
import { atom as nanoAtom, computed as nanoComputed, map as nanoMap } from 'nanostores';
import { onStart, onStop, onSet, onNotify, onMount } from './events'; // Use default names
import { onStart as nanoOnStart, onStop as nanoOnStop } from 'nanostores';
describe('onStart/onStop Overhead (Atom)', () => {
    bench('zen', () => {
        const $a = atom(0); // Use atom factory
        const unsubStart = onStart($a, () => { }); // Add cast back
        const unsubStop = onStop($a, () => { }); // Add cast back
        const unsub = subscribe($a, () => { }); // Use subscribe, add cast back
        unsub();
        unsubStart();
        unsubStop();
    });
    bench('nanostores', () => {
        const $a = nanoAtom(0);
        const unsubStart = nanoOnStart($a, () => { });
        const unsubStop = nanoOnStop($a, () => { });
        const unsub = $a.subscribe(() => { });
        unsub();
        unsubStart();
        unsubStop();
    });
});
describe('onStart/onStop Overhead (Computed)', () => {
    bench('zen', () => {
        const $a = atom(0); // Use atom factory
        const $c = computed([$a], (a) => a); // Use computed, add cast back, fix signature
        const unsubStart = onStart($c, () => { }); // Add cast back
        const unsubStop = onStop($c, () => { }); // Add cast back
        const unsub = subscribe($c, () => { }); // Use subscribe, add cast back
        unsub();
        unsubStart();
        unsubStop();
    });
    bench('nanostores', () => {
        const $a = nanoAtom(0);
        const $c = nanoComputed($a, a => a); // Nanostores computed takes single atom
        const unsubStart = nanoOnStart($c, () => { });
        const unsubStop = nanoOnStop($c, () => { });
        const unsub = $c.subscribe(() => { });
        unsub();
        unsubStart();
        unsubStop();
    });
});
describe('onStart/onStop Overhead (Map)', () => {
    bench('zen', () => {
        const $m = map({}); // Use map factory
        const unsubStart = onStart($m, () => { }); // Add cast back
        const unsubStop = onStop($m, () => { }); // Add cast back
        const unsub = subscribe($m, () => { }); // Use subscribe, add cast back
        unsub();
        unsubStart();
        unsubStop();
    });
    bench('nanostores', () => {
        const $m = nanoMap({});
        const unsubStart = nanoOnStart($m, () => { });
        const unsubStop = nanoOnStop($m, () => { });
        const unsub = $m.subscribe(() => { });
        unsub();
        unsubStart();
        unsubStop();
    });
});
// Nanostores doesn't have deepMap equivalent for direct comparison
describe('onStart/onStop Overhead (DeepMap - Zen only)', () => {
    bench('zen', () => {
        const $dm = deepMap({}); // Use deepMap factory
        const unsubStart = onStart($dm, () => { }); // Add cast back
        const unsubStop = onStop($dm, () => { }); // Add cast back
        const unsub = subscribe($dm, () => { }); // Use subscribe, add cast back
        unsub();
        unsubStart();
        unsubStop();
    });
});
// --- onSet / onNotify / onMount (Zen only) ---
describe('Zen Specific Event Overheads', () => {
    bench('zen onSet overhead (atom)', () => {
        const $a = atom(0); // Use atom factory
        const unsubSet = onSet($a, () => { }); // Add cast back
        setAtom($a, 1);
        unsubSet();
    });
    bench('zen onSet overhead (map)', () => {
        const $m = map({}); // Use map factory
        const unsubSet = onSet($m, () => { }); // Add cast back
        setMapKey($m, 'a', 1);
        unsubSet();
    });
    bench('zen onSet overhead (deepMap)', () => {
        const $dm = deepMap({}); // Use deepMap factory
        const unsubSet = onSet($dm, () => { }); // Add cast back
        setDeepMapPath($dm, 'a', 1);
        unsubSet();
    });
    bench('zen onNotify overhead (atom)', () => {
        const $a = atom(0); // Use atom factory
        const unsubNotify = onNotify($a, () => { }); // Add cast back
        subscribe($a, () => { }); // Need a subscriber to trigger notify, use subscribe, add cast back
        setAtom($a, 1);
        unsubNotify();
    });
    bench('zen onNotify overhead (computed)', () => {
        const $a = atom(0); // Use atom factory
        const $c = computed([$a], (a) => a); // Use computed, add cast back, fix signature
        const unsubNotify = onNotify($c, () => { }); // Add cast back
        subscribe($c, () => { }); // Need a subscriber to trigger notify, use subscribe, add cast back
        setAtom($a, 1); // Trigger computed update
        unsubNotify();
    });
    bench('zen onMount overhead (atom)', () => {
        const $a = atom(0); // Use atom factory
        const unsubMount = onMount($a, () => { }); // Use onMount, Called immediately, add cast back
        unsubMount();
    });
});
