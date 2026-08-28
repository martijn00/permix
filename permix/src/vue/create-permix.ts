import type { Component, InjectionKey, PropType, Ref } from 'vue'
import { defineComponent, onUnmounted, watch } from 'vue'

import type { Definition, DehydratedState, Permix, Rules } from '../core'
import { createPermix as createPermixCore } from '../core'
import type { PermixComponents } from './components'
import { createComponents } from './components'
import { usePermix as usePermixFromContext } from './composables'
import type { PermixContext } from './context'
import {
  createPermixInjectionKey,
  providePermixContext,
  usePermixContext,
} from './context'

export interface CreatePermixResult<D extends Definition> {
  permix: Permix<D>
  PermixProvider: Component
  PermixHydrate: Component
  usePermix: () => {
    check: Permix<D>['check']
    explain: Permix<D>['explain']
    isReady: ReturnType<typeof usePermixFromContext<D>>['isReady']
  }
  Check: PermixComponents<D>['Check']
}

/**
 * Create a Permix instance with isolated Vue bindings.
 *
 * Call once at module scope. The bound provider does not take a `permix`
 * prop. `usePermix()` takes no instance argument.
 *
 * @link https://permix.letstri.dev/docs/integrations/vue
 */
export function createPermix<D extends Definition>(
  instance?: Permix<D>
): CreatePermixResult<D> {
  const permix = instance ?? createPermixCore<D>()
  const key = createPermixInjectionKey<D>()
  const { Check } = createComponents(permix, key)

  const BoundProvider = defineComponent({
    name: 'PermixProvider',
    setup(_, { slots }) {
      const cleanup = providePermixContext(
        permix,
        key as InjectionKey<Ref<PermixContext<any>>>
      )
      onUnmounted(cleanup)
      return () => slots.default?.()
    },
  })

  const BoundHydrate = defineComponent({
    name: 'PermixHydrate',
    props: {
      state: {
        type: Object as PropType<DehydratedState<D>>,
        required: true,
      },
    },
    setup(props, { slots }) {
      const context = usePermixContext(key)

      const hydrate = () => {
        const state = props.state as DehydratedState<D>
        context.value.permix.hydrate(state)
        context.value = {
          permix: context.value.permix,
          isReady: context.value.isReady,
          rules: context.value.isReady
            ? context.value.rules
            : (state as Rules<D>),
        }
      }

      hydrate()
      watch(() => props.state, hydrate)

      return () => slots.default?.()
    },
  })

  function useBoundPermix() {
    return usePermixFromContext(permix, key)
  }

  return {
    permix,
    PermixProvider: BoundProvider,
    PermixHydrate: BoundHydrate,
    usePermix: useBoundPermix,
    Check,
  }
}
