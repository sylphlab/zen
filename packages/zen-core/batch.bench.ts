import { bench, describe } from 'vitest'
import { atom as zenAtom } from './atom'
import { batch as zenBatch } from './batch'
import { atom as nanoAtom } from 'nanostores'

describe('Batch vs Sequential Sets (No Listeners)', () => {
  describe('2 Sets', () => {
    bench('zen batch', () => {
      let $a = zenAtom(0)
      let $b = zenAtom(0)
      zenBatch(() => {
        $a.set(1)
        $b.set(1)
      })
    })

    bench('nanostores sequential', () => {
      let $a = nanoAtom(0)
      let $b = nanoAtom(0)
      $a.set(1)
      $b.set(1)
    })
  })

  describe('5 Sets', () => {
     bench('zen batch', () => {
      let $a = zenAtom(0)
      let $b = zenAtom(0)
      let $c = zenAtom(0)
      let $d = zenAtom(0)
      let $e = zenAtom(0)
      zenBatch(() => {
        $a.set(1)
        $b.set(1)
        $c.set(1)
        $d.set(1)
        $e.set(1)
      })
    })

    bench('nanostores sequential', () => {
      let $a = nanoAtom(0)
      let $b = nanoAtom(0)
      let $c = nanoAtom(0)
      let $d = nanoAtom(0)
      let $e = nanoAtom(0)
      $a.set(1)
      $b.set(1)
      $c.set(1)
      $d.set(1)
      $e.set(1)
    })
  })

  describe('10 Sets', () => {
    bench('zen batch', () => {
      let atoms = Array.from({ length: 10 }, () => zenAtom(0))
      zenBatch(() => {
        for (let $a of atoms) {
          $a.set(1)
        }
      })
    })

    bench('nanostores sequential', () => {
      let atoms = Array.from({ length: 10 }, () => nanoAtom(0))
      for (let $a of atoms) {
        $a.set(1)
      }
    })
  })
})

describe('Batch vs Sequential Sets (With 1 Listener Each)', () => {
   describe('2 Sets', () => {
     bench('zen batch', () => {
      let $a = zenAtom(0)
      let $b = zenAtom(0)
      $a.subscribe(() => {})
      $b.subscribe(() => {})
      zenBatch(() => {
        $a.set(1)
        $b.set(1)
      })
    })

    bench('nanostores sequential', () => {
      let $a = nanoAtom(0)
      let $b = nanoAtom(0)
      $a.subscribe(() => {})
      $b.subscribe(() => {})
      $a.set(1)
      $b.set(1)
    })
   })

   describe('5 Sets', () => {
      bench('zen batch', () => {
        let atoms = Array.from({ length: 5 }, () => zenAtom(0))
        atoms.forEach($a => $a.subscribe(() => {}))
        zenBatch(() => {
          for (let $a of atoms) {
            $a.set(1)
          }
        })
      })

      bench('nanostores sequential', () => {
        let atoms = Array.from({ length: 5 }, () => nanoAtom(0))
        atoms.forEach($a => $a.subscribe(() => {}))
        for (let $a of atoms) {
          $a.set(1)
        }
      })
   })

    describe('10 Sets', () => {
        bench('zen batch', () => {
            let atoms = Array.from({ length: 10 }, () => zenAtom(0))
            atoms.forEach($a => $a.subscribe(() => {}))
            zenBatch(() => {
            for (let $a of atoms) {
                $a.set(1)
            }
            })
        })

        bench('nanostores sequential', () => {
            let atoms = Array.from({ length: 10 }, () => nanoAtom(0))
            atoms.forEach($a => $a.subscribe(() => {}))
            for (let $a of atoms) {
            $a.set(1)
            }
        })
    })
})

// Nested batching doesn't have a direct nanostores equivalent, keep separate
describe('Zen Nested Batching', () => {
  bench('zen nested batch 3 sets total', () => {
    let $a = zenAtom(0)
    let $b = zenAtom(0)
    let $c = zenAtom(0)
    zenBatch(() => {
      $a.set(1)
      zenBatch(() => {
        $b.set(1)
      })
      $c.set(1)
    })
  })
})