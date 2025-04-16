import { bench, describe } from 'vitest'
import { atom as zenAtom } from './atom'
import { computed as zenComputed } from './computed'
import { map as zenMap } from './map'
import { deepMap as zenDeepMap } from './deepMap'
import { atom as nanoAtom, computed as nanoComputed, map as nanoMap } from 'nanostores'
import { onStart as zenOnStart, onStop as zenOnStop, onSet as zenOnSet, onNotify as zenOnNotify, onMount as zenOnMount } from './events'
import { onStart as nanoOnStart, onStop as nanoOnStop } from 'nanostores'


describe('onStart/onStop Overhead (Atom)', () => {
  bench('zen', () => {
    let $a = zenAtom(0)
    let unsubStart = zenOnStart($a, () => {})
    let unsubStop = zenOnStop($a, () => {})
    let unsub = $a.subscribe(() => {})
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
    let $a = zenAtom(0)
    let $c = zenComputed([$a], a => a)
    let unsubStart = zenOnStart($c, () => {})
    let unsubStop = zenOnStop($c, () => {})
    let unsub = $c.subscribe(() => {})
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
        let $m = zenMap({})
        let unsubStart = zenOnStart($m, () => {})
        let unsubStop = zenOnStop($m, () => {})
        let unsub = $m.subscribe(() => {})
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
    let $dm = zenDeepMap({})
    let unsubStart = zenOnStart($dm, () => {})
    let unsubStop = zenOnStop($dm, () => {})
    let unsub = $dm.subscribe(() => {})
    unsub()
    unsubStart()
    unsubStop()
  })
})

// --- onSet / onNotify / onMount (Zen only) ---
describe('Zen Specific Event Overheads', () => {
  bench('zen onSet overhead (atom)', () => {
    let $a = zenAtom(0)
    let unsubSet = zenOnSet($a, () => {})
    $a.set(1)
    unsubSet()
  })

  bench('zen onSet overhead (map)', () => {
    let $m = zenMap<{ a?: number }>({})
    let unsubSet = zenOnSet($m, () => {})
    $m.setKey('a', 1)
    unsubSet()
  })

  bench('zen onSet overhead (deepMap)', () => {
    let $dm = zenDeepMap<{ a?: number }>({})
    let unsubSet = zenOnSet($dm, () => {})
    $dm.setPath('a', 1)
    unsubSet()
  })

  bench('zen onNotify overhead (atom)', () => {
    let $a = zenAtom(0)
    let unsubNotify = zenOnNotify($a, () => {})
    $a.subscribe(() => {}) // Need a subscriber to trigger notify
    $a.set(1)
    unsubNotify()
  })

   bench('zen onNotify overhead (computed)', () => {
    let $a = zenAtom(0)
    let $c = zenComputed([$a], a => a)
    let unsubNotify = zenOnNotify($c, () => {})
    $c.subscribe(() => {}) // Need a subscriber to trigger notify
    $a.set(1) // Trigger computed update
    unsubNotify()
  })

  bench('zen onMount overhead (atom)', () => {
    let $a = zenAtom(0) // Use zenAtom
    let unsubMount = zenOnMount($a, () => {}) // Use zenOnMount, Called immediately
    unsubMount()
  })
})