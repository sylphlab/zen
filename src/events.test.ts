import { test, expect, vi, describe, beforeEach } from 'vitest'
import { atom } from './atom'
import { computed } from './computed'
import { map } from './map'
import { deepMap } from './deepMap'
import { onStart, onStop, onSet } from './events' // Removed onDestroy
import { batch } from './batch'
import type { Atom, ReadonlyAtom } from './core'

describe('events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- onStart ---
  describe('onStart', () => {
    test('should call listener when first subscriber is added (atom)', () => {
      let $a = atom(0)
      let startListener = vi.fn()
      onStart($a, startListener)

      expect(startListener).not.toHaveBeenCalled()
      let unsub = $a.subscribe(() => {})
      expect(startListener).toHaveBeenCalledTimes(1)
      let unsub2 = $a.subscribe(() => {})
      expect(startListener).toHaveBeenCalledTimes(1) // Only called on first
      unsub()
      unsub2()
    })

    test('should call listener when first subscriber is added (computed)', () => {
      let $a = atom(0)
      let $c = computed([$a], (a) => a + 1) // Pass stores as array
      let startListener = vi.fn()
      onStart($c, startListener)

      expect(startListener).not.toHaveBeenCalled()
      let unsub = $c.subscribe(() => {})
      expect(startListener).toHaveBeenCalledTimes(1)
      let unsub2 = $c.subscribe(() => {})
      expect(startListener).toHaveBeenCalledTimes(1)
      unsub()
      unsub2()
    })

     test('should call listener when first subscriber is added (map)', () => {
      let $m = map({ a: 1 })
      let startListener = vi.fn()
      onStart($m, startListener)

      expect(startListener).not.toHaveBeenCalled()
      let unsub = $m.subscribe(() => {})
      expect(startListener).toHaveBeenCalledTimes(1)
      let unsub2 = $m.subscribe(() => {})
      expect(startListener).toHaveBeenCalledTimes(1)
      unsub()
      unsub2()
    })

     test('should call listener when first subscriber is added (deepMap)', () => {
      let $dm = deepMap({ user: { name: 'A' } })
      let startListener = vi.fn()
      onStart($dm, startListener)

      expect(startListener).not.toHaveBeenCalled()
      let unsub = $dm.subscribe(() => {})
      expect(startListener).toHaveBeenCalledTimes(1)
      let unsub2 = $dm.subscribe(() => {})
      expect(startListener).toHaveBeenCalledTimes(1)
      unsub()
      unsub2()
    })

    test('should return an unsubscribe function (atom)', () => {
      let $a = atom(0)
      let startListener = vi.fn()
      let unsubEvent = onStart($a, startListener)

      let unsubSub = $a.subscribe(() => {})
      expect(startListener).toHaveBeenCalledTimes(1)

      unsubEvent() // Unsubscribe the event listener

      unsubSub() // Last data subscriber leaves
      let unsubSub2 = $a.subscribe(() => {}) // New data subscriber joins
      expect(startListener).toHaveBeenCalledTimes(1) // Event listener should not fire again
      unsubSub2()
    })
  })

  // --- onStop ---
  describe('onStop', () => {
    test('should call listener when last subscriber leaves (atom)', () => {
      let $a = atom(0)
      let stopListener = vi.fn()
      onStop($a, stopListener)

      let unsub = $a.subscribe(() => {})
      let unsub2 = $a.subscribe(() => {})
      expect(stopListener).not.toHaveBeenCalled()
      unsub()
      expect(stopListener).not.toHaveBeenCalled()
      unsub2() // Last one leaves
      expect(stopListener).toHaveBeenCalledTimes(1)
    })

     test('should call listener when last subscriber leaves (computed)', () => {
      let $a = atom(0)
      let $c = computed([$a], (a) => a + 1) // Pass stores as array
      let stopListener = vi.fn()
      onStop($c, stopListener)

      let unsub = $c.subscribe(() => {})
      let unsub2 = $c.subscribe(() => {})
      expect(stopListener).not.toHaveBeenCalled()
      unsub()
      expect(stopListener).not.toHaveBeenCalled()
      unsub2() // Last one leaves
      expect(stopListener).toHaveBeenCalledTimes(1)
    })

     test('should call listener when last subscriber leaves (map)', () => {
      let $m = map({ a: 1 })
      let stopListener = vi.fn()
      onStop($m, stopListener)

      let unsub = $m.subscribe(() => {})
      let unsub2 = $m.subscribe(() => {})
      expect(stopListener).not.toHaveBeenCalled()
      unsub()
      expect(stopListener).not.toHaveBeenCalled()
      unsub2() // Last one leaves
      expect(stopListener).toHaveBeenCalledTimes(1)
    })

     test('should call listener when last subscriber leaves (deepMap)', () => {
      let $dm = deepMap({ user: { name: 'A' } })
      let stopListener = vi.fn()
      onStop($dm, stopListener)

      let unsub = $dm.subscribe(() => {})
      let unsub2 = $dm.subscribe(() => {})
      expect(stopListener).not.toHaveBeenCalled()
      unsub()
      expect(stopListener).not.toHaveBeenCalled()
      unsub2() // Last one leaves
      expect(stopListener).toHaveBeenCalledTimes(1)
    })

    test('should return an unsubscribe function (atom)', () => {
      let $a = atom(0)
      let stopListener = vi.fn()
      let unsubEvent = onStop($a, stopListener)

      let unsubSub = $a.subscribe(() => {})
      unsubSub() // Last subscriber leaves
      expect(stopListener).toHaveBeenCalledTimes(1)

      unsubEvent() // Unsubscribe the event listener

      let unsubSub2 = $a.subscribe(() => {})
      unsubSub2() // Last subscriber leaves again
      expect(stopListener).toHaveBeenCalledTimes(1) // Event listener should not fire again
    })
  })

  // --- onSet ---
  describe('onSet', () => {
    test('should call listener immediately when set is called (atom)', () => {
      let $a = atom(0)
      let setListener = vi.fn()
      onSet($a, setListener)

      $a.set(1)
      expect(setListener).toHaveBeenCalledTimes(1)
      expect(setListener).toHaveBeenCalledWith(1) // Only receives new value

      $a.set(2)
      expect(setListener).toHaveBeenCalledTimes(2)
      expect(setListener).toHaveBeenCalledWith(2)
    })

    test('should NOT call listener within batch (atom)', () => {
      let $a = atom(0)
      let setListener = vi.fn()
      onSet($a, setListener)

      batch(() => {
        $a.set(1)
        $a.set(2)
        // setListener should NOT be called during the batch
        expect(setListener).not.toHaveBeenCalled()
      })
      // setListener should still NOT be called after the batch
      expect(setListener).not.toHaveBeenCalled()
    })

    test('should not be called for computed (throws error)', () => {
      let $a = atom(0)
      let $c = computed([$a], (a) => a + 1) // Pass stores as array
      let setListener = vi.fn()
      // Expect onSet to throw when used with a ReadonlyAtom
      expect(() => onSet($c, setListener)).toThrow()
      expect(setListener).not.toHaveBeenCalled()
    })

     test('should call listener immediately when setKey is called (map)', () => {
      let $m = map<{ a?: number; b?: string }>({ a: 1 })
      let setListener = vi.fn()
      onSet($m, setListener)

      $m.setKey('a', 2)
      expect(setListener).toHaveBeenCalledTimes(1)
      expect(setListener).toHaveBeenCalledWith({ a: 2 }) // Receives the whole new object

      $m.setKey('b', 'hello')
      expect(setListener).toHaveBeenCalledTimes(2)
      expect(setListener).toHaveBeenCalledWith({ a: 2, b: 'hello' })
    })

     test('should call listener immediately when set is called (map)', () => {
      let $m = map<{ a?: number; b?: string }>({ a: 1 })
      let setListener = vi.fn()
      onSet($m, setListener)

      $m.set({ b: 'new' })
      expect(setListener).toHaveBeenCalledTimes(1)
      expect(setListener).toHaveBeenCalledWith({ b: 'new' })
    })

     test('should call listener immediately when setPath is called (deepMap)', () => {
      let $dm = deepMap<{ user: { name: string; age?: number } }>({ user: { name: 'A' } })
      let setListener = vi.fn()
      onSet($dm, setListener)

      $dm.setPath('user.name', 'B') // Use setPath
      expect(setListener).toHaveBeenCalledTimes(1)
      // Deep map might pass the modified object or a clone
      expect(setListener).toHaveBeenCalledWith({ user: { name: 'B' } })

      $dm.setPath('user.age', 30) // Use setPath
      expect(setListener).toHaveBeenCalledTimes(2)
      expect(setListener).toHaveBeenCalledWith({ user: { name: 'B', age: 30 } })
    })

     test('should call listener immediately when set is called (deepMap)', () => {
      let $dm = deepMap<{ user: { name: string } }>({ user: { name: 'A' } })
      let setListener = vi.fn()
      onSet($dm, setListener)

      $dm.set({ user: { name: 'C' } })
      expect(setListener).toHaveBeenCalledTimes(1)
      expect(setListener).toHaveBeenCalledWith({ user: { name: 'C' } })
    })

    test('should return an unsubscribe function (atom)', () => {
      let $a = atom(0)
      let setListener = vi.fn()
      let unsubEvent = onSet($a, setListener)

      $a.set(1)
      expect(setListener).toHaveBeenCalledTimes(1)

      unsubEvent() // Unsubscribe the event listener

      $a.set(2)
      expect(setListener).toHaveBeenCalledTimes(1) // Event listener should not fire again
    })
  })

  // Removed onDestroy tests as the function does not exist
})
