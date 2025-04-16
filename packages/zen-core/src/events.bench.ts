
import { bench, describe } from 'vitest'
import { createAtom, set as setAtom, subscribe as subscribeAtom } from './atom'
import { createComputed, subscribe as subscribeComputed } from './computed'
import { createMap, setKey as setMapKey, subscribe as subscribeMap } from './map'
import { createDeepMap, setPath as setDeepMapPath, subscribe as subscribeDeepMap } from './deepMap'
import { atom as nanoAtom, computed as nanoComputed, map as nanoMap } from 'nanostores'
import { onStart, onStop, onSet, onNotify, onMount } from './events' // Use default names
import { onStart as nanoOnStart, onStop as nanoOnStop } from 'nanostores'


describe('onStart/onStop Overhead (Atom)', () => {
  bench('zen', () => {
    const $a = createAtom(0)
    const unsubStart = onStart($a, () => {})
    const unsubStop = onStop($a, () => {})
    const unsub = subscribeAtom($a, () => {})
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
    const $a = createAtom(0)
    const $c = createComputed([$a], a => a)
    const unsubStart = onStart($c, () => {})
    const unsubStop = onStop($c, () => {})
    const unsub = subscribeComputed($c, () => {})
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

describe('onStart/onStop Overhead (Map)', () => {
    bench('zen', () => {
        const $m = createMap({})
        const unsubStart = onStart($m, () => {})
        const unsubStop = onStop($m, () => {})
        const unsub = subscribeMap($m, () => {})
        unsub()
        unsubStart()
        unsubStop()
    })

    bench('nanostores', () => {
        const $m = nanoMap({})
        const unsubStart = nanoOnStart($m, () => {})
        const unsubStop = nanoOnStop($m, () => {})
        const unsub = $m.subscribe(() => {})
        unsub()
        unsubStart()
        unsubStop()
    })
})

// Nanostores doesn't have deepMap equivalent for direct comparison
describe('onStart/onStop Overhead (DeepMap - Zen only)', () => {
   bench('zen', () => {
    const $dm = createDeepMap({})
    const unsubStart = onStart($dm, () => {})
    const unsubStop = onStop($dm, () => {})
    const unsub = subscribeDeepMap($dm, () => {})
    unsub()
    unsubStart()
    unsubStop()
  })
})

// --- onSet / onNotify / onMount (Zen only) ---
describe('Zen Specific Event Overheads', () => {
  bench('zen onSet overhead (atom)', () => {
    const $a = createAtom(0)
    const unsubSet = onSet($a, () => {})
    setAtom($a, 1)
    unsubSet()
  })

  bench('zen onSet overhead (map)', () => {
    const $m = createMap<{ a?: number }>({})
    const unsubSet = onSet($m, () => {})
    setMapKey($m, 'a', 1)
    unsubSet()
  })

  bench('zen onSet overhead (deepMap)', () => {
    const $dm = createDeepMap<{ a?: number }>({})
    const unsubSet = onSet($dm, () => {})
    setDeepMapPath($dm, 'a', 1)
    unsubSet()
  })

  bench('zen onNotify overhead (atom)', () => {
    const $a = createAtom(0)
    const unsubNotify = onNotify($a, () => {})
    subscribeAtom($a, () => {}) // Need a subscriber to trigger notify
    setAtom($a, 1)
    unsubNotify()
  })

   bench('zen onNotify overhead (computed)', () => {
    const $a = createAtom(0)
    const $c = createComputed([$a], a => a)
    const unsubNotify = onNotify($c, () => {})
    subscribeComputed($c, () => {}) // Need a subscriber to trigger notify
    setAtom($a, 1) // Trigger computed update
    unsubNotify()
  })

  bench('zen onMount overhead (atom)', () => {
    const $a = createAtom(0) // Use createAtom
    const unsubMount = onMount($a, () => {}) // Use onMount, Called immediately
    unsubMount()
  })
})