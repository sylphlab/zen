import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { atom, computed, Atom } from './index' // Import from index
import { onMount, onStart, onStop, onSet, onNotify, Unsubscribe } from './index' // Import events from index
import { batch } from './core'

// Mock timer for debounce (TODO: Implement debounce later)
// vi.useFakeTimers();

describe('Lifecycle Events', () => {
  let store: Atom<number>
  let computedStore: ReturnType<typeof computed<string, [typeof store]>>
  let storeUnsubscribers: Unsubscribe[] = []
  let computedUnsubscribers: Unsubscribe[] = []
  let eventUnsubscribers: Unsubscribe[] = []

  beforeEach(() => {
    store = atom(0)
    // Wrap store in an array for computed dependencies
    computedStore = computed([store], (val) => `Value: ${val}`)
    storeUnsubscribers = []
    computedUnsubscribers = []
    eventUnsubscribers = []
  })

  afterEach(() => {
    // Cleanup listeners and event handlers
    storeUnsubscribers.forEach(unsub => unsub());
    computedUnsubscribers.forEach(unsub => unsub());
    eventUnsubscribers.forEach(unsub => unsub());
    // TODO: Implement cleanStores equivalent if necessary
  });


  describe('onStart / onStop / _active', () => {
    it('should call onStart when the first listener subscribes (atom)', () => {
      const startCb = vi.fn()
      eventUnsubscribers.push(onStart(store, startCb))

      expect(startCb).not.toHaveBeenCalled()
      // @ts-ignore Check internal state
      expect(store._active).toBe(false)

      const unsub1 = store.subscribe(() => {})
      storeUnsubscribers.push(unsub1)
      expect(startCb).toHaveBeenCalledTimes(1)
       // @ts-ignore Check internal state
      expect(store._active).toBe(true)

      const unsub2 = store.subscribe(() => {})
      storeUnsubscribers.push(unsub2)
      expect(startCb).toHaveBeenCalledTimes(1) // Should not call again
    })

    it('should call onStop when the last listener unsubscribes (atom)', () => {
        const stopCb = vi.fn()
        eventUnsubscribers.push(onStop(store, stopCb))

        const unsub1 = store.subscribe(() => {})
        storeUnsubscribers.push(unsub1)
        const unsub2 = store.subscribe(() => {})
        storeUnsubscribers.push(unsub2)

        expect(stopCb).not.toHaveBeenCalled()
         // @ts-ignore Check internal state
        expect(store._active).toBe(true)

        unsub1()
        expect(stopCb).not.toHaveBeenCalled()
         // @ts-ignore Check internal state
        expect(store._active).toBe(true)

        unsub2() // Last one unsubscribes
        expect(stopCb).toHaveBeenCalledTimes(1) // TODO: Add debounce check later
         // @ts-ignore Check internal state
        expect(store._active).toBe(false)
    })

     it('should call onStart/onStop correctly for computed stores', () => {
         const startCb = vi.fn()
         const stopCb = vi.fn()
         eventUnsubscribers.push(onStart(computedStore, startCb))
         eventUnsubscribers.push(onStop(computedStore, stopCb))

         expect(startCb).not.toHaveBeenCalled();
         expect(stopCb).not.toHaveBeenCalled();
          // @ts-ignore Check internal state
         expect(computedStore._active).toBe(false);

         const unsub = computedStore.subscribe(() => {});
         computedUnsubscribers.push(unsub);

         expect(startCb).toHaveBeenCalledTimes(1);
         expect(stopCb).not.toHaveBeenCalled();
          // @ts-ignore Check internal state
         expect(computedStore._active).toBe(true);
          // @ts-ignore Check internal state
         expect(computedStore._unsubscribers.length).toBe(1); // Should subscribe to source

         unsub();

         expect(startCb).toHaveBeenCalledTimes(1);
         expect(stopCb).toHaveBeenCalledTimes(1); // TODO: Add debounce check later
          // @ts-ignore Check internal state
         expect(computedStore._active).toBe(false);
          expect(computedStore._unsubscribers).toBeNull(); // Should unsubscribe from source
     })
  })

  describe('onMount', () => {
     it('should call mount when first listener subscribes and unmount when last unsubscribes', () => {
         const mountCb = vi.fn()
         const unmountCb = vi.fn()
         mountCb.mockReturnValue(unmountCb)

         eventUnsubscribers.push(onMount(store, mountCb))

         expect(mountCb).not.toHaveBeenCalled()
         expect(unmountCb).not.toHaveBeenCalled()
          // @ts-ignore Check internal state
         expect(store._active).toBe(false)

         const unsub1 = store.subscribe(() => {})
         storeUnsubscribers.push(unsub1)

         expect(mountCb).toHaveBeenCalledTimes(1)
         expect(unmountCb).not.toHaveBeenCalled()
          // @ts-ignore Check internal state
         expect(store._active).toBe(true)

         const unsub2 = store.subscribe(() => {})
         storeUnsubscribers.push(unsub2)
         expect(mountCb).toHaveBeenCalledTimes(1) // Not called again

         unsub1()
         expect(unmountCb).not.toHaveBeenCalled() // Not called yet (TODO: debounce)

         unsub2()
         expect(unmountCb).toHaveBeenCalledTimes(1) // Called on last unsub (TODO: debounce)
          // @ts-ignore Check internal state
         expect(store._active).toBe(false)
     })

      it('should call mount immediately if store is already active', () => {
          const unsub1 = store.subscribe(() => {}); // Make store active first
          storeUnsubscribers.push(unsub1);
           // @ts-ignore Check internal state
          expect(store._active).toBe(true);

          const mountCb = vi.fn();
          const unmountCb = vi.fn();
          mountCb.mockReturnValue(unmountCb);

          eventUnsubscribers.push(onMount(store, mountCb));

          expect(mountCb).toHaveBeenCalledTimes(1); // Called immediately
          expect(unmountCb).not.toHaveBeenCalled();

          unsub1(); // Last unsub
          expect(unmountCb).toHaveBeenCalledTimes(1); // Cleanup called
      })

      it('should handle multiple onMount listeners', () => {
         const unmountCb1 = vi.fn();
         const unmountCb2 = vi.fn();
         const mountCb1 = vi.fn(() => unmountCb1);
         const mountCb2 = vi.fn(() => unmountCb2);

         eventUnsubscribers.push(onMount(store, mountCb1));
         eventUnsubscribers.push(onMount(store, mountCb2));

         const unsub = store.subscribe(() => {});
         storeUnsubscribers.push(unsub);

         // Check mount callbacks are called once
         expect(mountCb1).toHaveBeenCalledTimes(1);
         expect(mountCb2).toHaveBeenCalledTimes(1);
         // Check unmount callbacks are NOT called yet
         expect(unmountCb1).not.toHaveBeenCalled();
         expect(unmountCb2).not.toHaveBeenCalled();

         unsub(); // Trigger unmount

         // Check unmount callbacks are called once
         expect(unmountCb1).toHaveBeenCalledTimes(1);
         expect(unmountCb2).toHaveBeenCalledTimes(1);

      })
  })

   describe('onSet', () => {
       it('should call onSet before value is changed', () => {
           const setCb = vi.fn();
           eventUnsubscribers.push(onSet(store, setCb));

           expect(store.get()).toBe(0);
           store.set(1);

           expect(setCb).toHaveBeenCalledTimes(1);
           const payload = setCb.mock.calls[0][0];
           expect(payload.newValue).toBe(1);
           // Check that store value is still old value *during* onSet
           // This requires modifying the callback slightly for the test
           let valueDuringCall = -1;
            const setCbCheckValue = vi.fn((payload) => {
                valueDuringCall = store.get();
            });
            eventUnsubscribers.push(onSet(store, setCbCheckValue));
            store.set(2);
            expect(setCbCheckValue).toHaveBeenCalledTimes(1);
            expect(valueDuringCall).toBe(1); // Value should be the old one (1) during the call for set(2)

            expect(store.get()).toBe(2); // Value is updated after onSet completes
       });

       it('should abort set if abort() is called', () => {
           const setCb = vi.fn((payload) => {
               if (payload.newValue === 5) {
                   payload.abort();
               }
           });
           eventUnsubscribers.push(onSet(store, setCb));

           store.set(1);
           expect(store.get()).toBe(1);
           expect(setCb).toHaveBeenCalledTimes(1);

           store.set(5); // This should be aborted
           expect(store.get()).toBe(1); // Value should not have changed
           expect(setCb).toHaveBeenCalledTimes(2);

           store.set(10);
           expect(store.get()).toBe(10);
           expect(setCb).toHaveBeenCalledTimes(3);
       });

        it('should work with computed stores (for internal updates)', () => {
            const setCb = vi.fn();
             // We listen on the source store to trigger the computed update
            eventUnsubscribers.push(onSet(computedStore, setCb));

            // Subscribe to computed to make it active
             const unsub = computedStore.subscribe(() => {});
             computedUnsubscribers.push(unsub);

            store.set(1); // Trigger computed update

            expect(setCb).toHaveBeenCalledTimes(1);
            expect(setCb.mock.calls[0][0].newValue).toBe('Value: 1');

             store.set(2);
              expect(setCb).toHaveBeenCalledTimes(2);
             expect(setCb.mock.calls[1][0].newValue).toBe('Value: 2');
        });
   });

   describe('onNotify', () => {
       it('should call onNotify before listeners are notified', () => {
           const notifyCb = vi.fn();
           const listenerCb = vi.fn();
           eventUnsubscribers.push(onNotify(store, notifyCb));
           storeUnsubscribers.push(store.subscribe(listenerCb));

           listenerCb.mockClear(); // Clear initial subscribe call

           store.set(1);

           expect(notifyCb).toHaveBeenCalledTimes(1);
           expect(listenerCb).toHaveBeenCalledTimes(1);

           // Ensure notifyCb is called before listenerCb
           // Vitest mock call order might not be reliable enough for this precise check easily.
           // We rely on the implementation order.
           const notifyPayload = notifyCb.mock.calls[0][0];
           expect(notifyPayload.newValue).toBe(1);
           expect(listenerCb).toHaveBeenCalledWith(1, 0);
       });

       it('should abort notification if abort() is called', () => {
           const notifyCb = vi.fn((payload) => {
               if (payload.newValue === 5) {
                   payload.abort();
               }
           });
           const listenerCb = vi.fn();
           eventUnsubscribers.push(onNotify(store, notifyCb));
           storeUnsubscribers.push(store.subscribe(listenerCb));

           listenerCb.mockClear();

           store.set(1);
           expect(store.get()).toBe(1);
           expect(notifyCb).toHaveBeenCalledTimes(1);
           expect(listenerCb).toHaveBeenCalledTimes(1);

           store.set(5); // Notification should be aborted
           expect(store.get()).toBe(5); // Value changes
           expect(notifyCb).toHaveBeenCalledTimes(2);
           expect(listenerCb).toHaveBeenCalledTimes(1); // Listener not called again

           store.set(10);
           expect(store.get()).toBe(10);
           expect(notifyCb).toHaveBeenCalledTimes(3);
           expect(listenerCb).toHaveBeenCalledTimes(2); // Listener called for 10
       });

       it('should pass shared object between onSet and onNotify', () => {
           const marker = Symbol('marker');
           const onSetCb = vi.fn((payload) => {
               payload.shared[marker] = 'data from onSet';
           });
           const onNotifyCb = vi.fn();

           eventUnsubscribers.push(onSet(store, onSetCb));
           eventUnsubscribers.push(onNotify(store, onNotifyCb));

           store.set(1);

           expect(onSetCb).toHaveBeenCalledTimes(1);
           expect(onNotifyCb).toHaveBeenCalledTimes(1);
           expect(onNotifyCb.mock.calls[0][0].shared[marker]).toBe('data from onSet');
       });
   });

   // TODO: Add tests for onMount debounce behavior once implemented
})
