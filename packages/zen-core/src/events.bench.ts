
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
    let $a = createAtom(0)
    let unsubStart = onStart($a, () => {})
    let unsubStop = onStop($a, () => {})
    let unsub = subscribeAtom($a, () => {})
    unsub()
    unsubStart()
    unsubStop()
  })

  bench('nanostores', () => {
    let $a = nanoAtom(0)
    let unsubStart = nanoOnStart($a, () => {})
    let unsubStop = nanoOnStop($a, () => {})
    let unsub = $a.subscribe(() => {})
    unsub()
    unsubStart()
    unsubStop()
  })
})

describe('onStart/onStop Overhead (Computed)', () => {
   bench('zen', () => {
    let $a = createAtom(0)
    let $c = createComputed([$a], a => a)
    let unsubStart = onStart($c, () => {})
    let unsubStop = onStop($c, () => {})
    let unsub = subscribeComputed($c, () => {})
    unsub()
    unsubStart()
    unsubStop()
  })

  bench('nanostores', () => {
    let $a = nanoAtom(0)
    let $c = nanoComputed($a, a => a) // Nanostores computed takes single atom
    let unsubStart = nanoOnStart($c, () => {})
    let unsubStop = nanoOnStop($c, () => {})
    let unsub = $c.subscribe(() => {})
    unsub()
    unsubStart()
    unsubStop()
  })
})

describe('onStart/onStop Overhead (Map)', () => {
    bench('zen', () => {
        let $m = createMap({})
        let unsubStart = onStart($m, () => {})
        let unsubStop = onStop($m, () => {})
        let unsub = subscribeMap($m, () => {})
        unsub()
        unsubStart()
        unsubStop()
    })

    bench('nanostores', () => {
        let $m = nanoMap({})
        let unsubStart = nanoOnStart($m, () => {})
        let unsubStop = nanoOnStop($m, () => {})
        let unsub = $m.subscribe(() => {})
        unsub()
        unsubStart()
        unsubStop()
    })
})

// Nanostores doesn't have deepMap equivalent for direct comparison
describe('onStart/onStop Overhead (DeepMap - Zen only)', () => {
   bench('zen', () => {
    let $dm = createDeepMap({})
    let unsubStart = onStart($dm, () => {})
    let unsubStop = onStop($dm, () => {})
    let unsub = subscribeDeepMap($dm, () => {})
    unsub()
    unsubStart()
    unsubStop()
  })
})

// --- onSet / onNotify / onMount (Zen only) ---
describe('Zen Specific Event Overheads', () => {
  bench('zen onSet overhead (atom)', () => {
    let $a = createAtom(0)
    let unsubSet = onSet($a, () => {})
    setAtom($a, 1)
    unsubSet()
  })

  bench('zen onSet overhead (map)', () => {
    let $m = createMap<{ a?: number }>({})
    let unsubSet = onSet($m, () => {})
    setMapKey($m, 'a', 1)
    unsubSet()
  })

  bench('zen onSet overhead (deepMap)', () => {
    let $dm = createDeepMap<{ a?: number }>({})
    let unsubSet = onSet($dm, () => {})
    setDeepMapPath($dm, 'a', 1)
    unsubSet()
  })

  bench('zen onNotify overhead (atom)', () => {
    let $a = createAtom(0)
    let unsubNotify = onNotify($a, () => {})
    subscribeAtom($a, () => {}) // Need a subscriber to trigger notify
    setAtom($a, 1)
    unsubNotify()
  })

   bench('zen onNotify overhead (computed)', () => {
    let $a = createAtom(0)
    let $c = createComputed([$a], a => a)
    let unsubNotify = onNotify($c, () => {})
    subscribeComputed($c, () => {}) // Need a subscriber to trigger notify
    setAtom($a, 1) // Trigger computed update
    unsubNotify()
  })

  bench('zen onMount overhead (atom)', () => {
    let $a = createAtom(0) // Use createAtom
    let unsubMount = onMount($a, () => {}) // Use onMount, Called immediately
    unsubMount()
  })
})