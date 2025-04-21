import { type Atom, set, zen } from '@sylphlab/zen-core';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { useStore } from './index';

describe('useStore', () => {
  let testAtom: Atom<number>;

  beforeEach(() => {
    // Reset atom before each test
    testAtom = zen(0);
  });

  it('should return initial value from store', async () => {
    let reactiveValue: number | undefined;

    const TestComponent = defineComponent({
      setup() {
        const count = useStore(testAtom);
        reactiveValue = count.value; // Access value for assertion
        return {}; // No template needed for this test
      },
      template: '<div></div>', // Dummy template
    });

    mount(TestComponent);
    await nextTick(); // Allow composition API effects to run

    expect(reactiveValue).toBe(0);
  });

  it('should update reactive value when store changes', async () => {
    let reactiveValue: import('vue').Ref<number> | undefined; // Correct type

    const TestComponent = defineComponent({
      setup() {
        const count = useStore(testAtom);
        // Assign ref directly to check reactivity later
        reactiveValue = count;
        return {};
      },
      template: '<div></div>',
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(reactiveValue?.value).toBe(0);

    // Update the store
    set(testAtom, 5);
    await nextTick(); // Allow Vue reactivity to update

    // Check if the reactive ref updated
    expect(reactiveValue?.value).toBe(5);

    wrapper.unmount(); // Ensure cleanup runs
  });

  // TODO: Test unmount cleanup explicitly if possible
  // TODO: Test with different store types (maps?) if applicable
});
