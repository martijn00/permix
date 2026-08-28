import { defineComponent, onUnmounted, watch } from 'vue'
import type { PropType } from 'vue'

import type { DehydratedState, Permix } from '../core'
import { providePermixContext, usePermixContext } from './context'

/**
 * Provides Permix context to the Vue component tree.
 *
 * @link https://permix.letstri.dev/docs/integrations/vue
 */
export const PermixProvider = defineComponent({
  name: 'PermixProvider',
  props: {
    permix: {
      type: Object as PropType<Permix<any>>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const cleanup = providePermixContext(props.permix)

    onUnmounted(cleanup)

    return () => slots.default?.()
  },
})

/**
 * Restores dehydrated server permissions on the client.
 *
 * @link https://permix.letstri.dev/docs/integrations/vue
 */
export const PermixHydrate = defineComponent({
  name: 'PermixHydrate',
  props: {
    state: {
      type: Object as PropType<DehydratedState<any>>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const context = usePermixContext()

    const hydrate = () => {
      context.value.permix.hydrate(props.state)
      context.value = {
        permix: context.value.permix,
        isReady: context.value.isReady,
        rules: context.value.isReady ? context.value.rules : props.state,
      }
    }

    hydrate()
    watch(() => props.state, hydrate)

    return () => slots.default?.()
  },
})
