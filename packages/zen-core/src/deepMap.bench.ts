import { bench, describe } from 'vitest';
import { deepMap as zenDeepMap, setPath as zenSetPath } from './deepMap'; // Use correct names and aliases
import { atom as zenAtom } from './atom'; // Use correct name
import type { Atom } from './atom'; // Import Atom type from atom.ts
import { deepMap as nanostoresDeepMap } from 'nanostores';

// Note: Direct comparison for deep immutable updates is difficult as libraries handle it differently.
// - Immer uses proxies for mutable-like updates.
// - Others might require manual spreading or dedicated selectors/lenses.
// We compare deepMap.setKey against manual spreading with a basic atom for context.

type DeepTestData = { user?: { profile?: { name?: string; age?: number }; tags?: string[] } }

describe('deepMap benchmark', () => {
  const initialDeepData = { user: { profile: { name: 'test', age: 1 }, settings: [1, 2, 3] } }
  describe('Creation', () => {
      bench('zen', () => {
        zenDeepMap(initialDeepData); // Use zenDeepMap
      })
      bench('nanostores', () => {
        nanostoresDeepMap(initialDeepData)
      })
  })

  // Removed atom creation bench as it's not a direct comparison for deepMap functionality
  // bench('atom Creation (Deep)', () => {
  //    atom<DeepTestData>({ user: { profile: { name: 'test', age: 1 }, tags: ['a'] } })
  // })


  const initialShallowData = { name: 'test', age: 1 }
  describe('setPath (shallow)', () => {
      bench('zen', () => {
        const store = zenDeepMap(initialShallowData); // Use zenDeepMap
        zenSetPath(store, 'age', 2); // Use zenSetPath
      })
      bench('nanostores', () => {
        const store = nanostoresDeepMap(initialShallowData)
        store.setKey('age', 2)
      })
  })
  // Removed atom manual spread for clarity, focusing on deepMap comparison
  // bench('atom manual spread (shallow)', () => { ... })


  const initial1LevelData = { user: { profile: { name: 'test' } } }
  describe('setPath (1 level deep - name)', () => {
      bench('zen', () => {
        const store = zenDeepMap(initial1LevelData); // Use zenDeepMap
        zenSetPath(store, 'user.profile.name', 'new'); // Use zenSetPath
      })
      bench('nanostores', () => {
        const store = nanostoresDeepMap(initial1LevelData)
        store.setKey('user.profile.name', 'new') // Nanostores also uses dot notation
      })
  })
  // Removed atom manual spread
  // bench('atom manual spread (1 level deep)', () => { ... })


  const initial2LevelData = { user: { profile: { name: 'test', age: 1 } } }
   describe('setPath (2 levels deep - age)', () => {
       bench('zen', () => {
         const store = zenDeepMap(initial2LevelData); // Use zenDeepMap
         zenSetPath(store, 'user.profile.age', 2); // Use zenSetPath
       })
       bench('nanostores', () => {
         const store = nanostoresDeepMap(initial2LevelData)
         store.setKey('user.profile.age', 2)
       })
   })
  // Removed atom manual spread
  // bench('atom manual spread (2 levels deep - age)', () => { ... })


   const initialArrayData = { items: [1, 2, 3] }
    describe('setPath (array index)', () => {
        bench('zen', () => {
          const store = zenDeepMap(initialArrayData); // Use zenDeepMap
          zenSetPath(store, ['items', 1], 99); // Use zenSetPath
        })
        bench('nanostores', () => {
          const store = nanostoresDeepMap(initialArrayData)
          store.setKey('items[1]', 99) // Nanostores uses bracket notation in string path
        })
    })
  // Removed atom manual spread
  // bench('atom manual spread (array index)', () => { ... })


    const initialEmptyData = {}
    describe('setPath (creating path)', () => {
        bench('zen', () => {
          const store = zenDeepMap<DeepTestData>(initialEmptyData); // Use zenDeepMap
          zenSetPath(store, 'user.profile.name', 'created'); // Use zenSetPath
        })
        bench('nanostores', () => {
          const store = nanostoresDeepMap<DeepTestData>(initialEmptyData)
          store.setKey('user.profile.name', 'created')
        })
    })
   // Removed atom manual spread
   // bench('atom manual spread (creating path)', () => { ... })

})
