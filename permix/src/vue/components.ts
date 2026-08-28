import type { PropType, SetupContext, SlotsType, VNode } from 'vue'
import { computed, defineComponent, onUnmounted, watch } from 'vue'

import type { CheckArgs, Definition, DehydratedState, Permix } from '../core'
import { usePermix } from './composables'
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

export interface CheckProps<D extends Definition> {
  path: CheckArgs<D>[0]
  data?: CheckArgs<D>[1]
  reverse?: boolean
}

type CheckContext = SetupContext<
  any,
  SlotsType<{
    default: void
    otherwise?: void
  }>
>

export interface PermixComponents<D extends Definition> {
  Check: (
    props: CheckProps<D>,
    context: CheckContext
  ) => VNode | VNode[] | undefined
}

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
    }

    hydrate()
    watch(() => props.state, hydrate)

    return () => slots.default?.()
  },
})

export function createComponents<D extends Definition>(
  permix: Pick<Permix<D>, 'getRules' | 'check'>
): PermixComponents<D> {
  const Check = defineComponent({
    name: 'Check',
    inheritAttrs: false,
    props: {
      path: {
        type: String,
        required: true,
      },
      data: {
        type: Object,
        required: false,
      },
      reverse: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    setup(props, { slots }) {
      const { check } = usePermix(permix)

      const hasPermission = computed(() =>
        check(...([props.path, props.data] as unknown as CheckArgs<D>))
      )

      return () => {
        const allowed = hasPermission.value
        return props.reverse
          ? allowed
            ? slots.otherwise?.()
            : slots.default?.()
          : allowed
            ? slots.default?.()
            : slots.otherwise?.()
      }
    },
  })

  return {
    Check: Check as unknown as PermixComponents<D>['Check'],
  }
}
