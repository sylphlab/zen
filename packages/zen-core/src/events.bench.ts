
import { bench, describe } from 'vitest'
import { atom, set as setAtom, subscribe as subscribeAtom } from './atom' // Use 'atom', 'subscribe'
import { computed } from './computed' // Use 'computed', remove subscribe import
// import { createMap, setKey as setMapKey, subscribe as subscribeMap } from './map' // Removed map import
import { deepMap, setPath as setDeepMapPath, subscribe as subscribeDeepMap } from './deepMap' // Use 'deepMap'
import { atom as nanoAtom, computed as nanoComputed, map as nanoMap } from 'nanostores'
import { onStart, onStop, onSet, onNotify, onMount } from './events' // Use default names
import { onStart as nanoOnStart, onStop as nanoOnStop } from 'nanostores'


describe('onStart/onStop Overhead (Atom)', () => {
  bench('zen', () => {
    const $a = atom(0) // Use atom factory
    const unsubStart = onStart($a as any, () => {}) // Add type assertion
    const unsubStop = onStop($a as any, () => {})   // Add type assertion
    const unsub = subscribeAtom($a as any, () => {}) // Add type assertion
    unsub()
    unsubStart()
    unsubStop()
  })

  bench('nanostores', () => {
    const $a = nanoAtom(0)
    const unsubStart = nanoOnStart($a, () => {})
    const unsubStop = nanoOnStop($a, () => {})
    const unsub = $a.subscribe(() => {})
    unsub()
    unsubStart()
    unsubStop()
  })
})

describe('onStart/onStop Overhead (Computed)', () => {
   bench('zen', () => {
    const $a = atom(0) // Use atom factory
    // Adjust computed callback signature and ensure input atom has assertion
    const $c = computed([$a as any], (a: unknown) => a as number)
    const unsubStart = onStart($c as any, () => {}) // Add type assertion
    const unsubStop = onStop($c as any, () => {})   // Add type assertion
    const unsub = subscribeAtom($c as any, () => {}) // Add type assertion
    unsub()
    unsubStart()
    unsubStop()
  })

  bench('nanostores', () => {
    const $a = nanoAtom(0)
    const $c = nanoComputed($a, a => a) // Nanostores computed takes single atom
    const unsubStart = nanoOnStart($c, () => {})
    const unsubStop = nanoOnStop($c, () => {})
    const unsub = $c.subscribe(() => {})
    unsub()
    unsubStart()
    unsubStop()
  })
})

// describe('onStart/onStop Overhead (Map)', () => { // Removed Map tests
//     bench('zen', () => {
//         const $m = createMap({})
//         const unsubStart = onStart($m, () => {})
//         const unsubStop = onStop($m, () => {})
//         const unsub = subscribeMap($m, () => {})
//         unsub()
//         unsubStart()
//         unsubStop()
//     })
//
//     bench('nanostores', () => {
//         const $m = nanoMap({})
//         const unsubStart = nanoOnStart($m, () => {})
//         const unsubStop = nanoOnStop($m, () => {})
//         const unsub = $m.subscribe(() => {})
//         unsub()
//         unsubStart()
//         unsubStop()
//     })
// })

// Nanostores doesn't have deepMap equivalent for direct comparison
describe('onStart/onStop Overhead (DeepMap - Zen only)', () => {
   bench('zen', () => {
    const $dm = deepMap({}) // Use deepMap factory
    const unsubStart = onStart($dm as any, () => {}) // Add type assertion
    const unsubStop = onStop($dm as any, () => {})   // Add type assertion
    const unsub = subscribeDeepMap($dm as any, () => {}) // Add type assertion
    unsub()
    unsubStart()
    unsubStop()
  })
})

// --- onSet / onNotify / onMount (Zen only) ---
describe('Zen Specific Event Overheads', () => {
  bench('zen onSet overhead (atom)', () => {
    const $a = atom(0) // Use atom factory
    const unsubSet = onSet($a as any, () => {}) // Add type assertion
    setAtom($a, 1)
    unsubSet()
  })

  // bench('zen onSet overhead (map)', () => { // Removed Map test
  //   const $m = createMap<{ a?: number }>({})
  //   const unsubSet = onSet($m, () => {})
  //   setMapKey($m, 'a', 1)
  //   unsubSet()
  // })

  bench('zen onSet overhead (deepMap)', () => {
    const $dm = deepMap<{ a?: number }>({}) // Use deepMap factory
    const unsubSet = onSet($dm as any, () => {}) // Add type assertion
    setDeepMapPath($dm, 'a', 1)
    unsubSet()
  })

  bench('zen onNotify overhead (atom)', () => {
    const $a = atom(0) // Use atom factory
    const unsubNotify = onNotify($a as any, () => {}) // Add type assertion
    subscribeAtom($a as any, () => {}) // Need a subscriber to trigger notify, add type assertion
    setAtom($a, 1)
    unsubNotify()
  })

   bench('zen onNotify overhead (computed)', () => {
    const $a = atom(0) // Use atom factory
    // Re-apply fixes: add assertion to input atom, adjust callback, add assertion to onNotify/subscribeAtom
    const $c = computed([$a as any], (a: unknown) => a as number)
    const unsubNotify = onNotify($c as any, () => {}) // Add type assertion
    subscribeAtom($c as any, () => {}) // Add type assertion
    setAtom($a, 1) // Trigger computed update
    unsubNotify()
  })

  bench('zen onMount overhead (atom)', () => {
    const $a = atom(0) // Use atom factory
    const unsubMount = onMount($a as any, () => {}) // Use onMount, Called immediately, add type assertion
    unsubMount()
  })
})