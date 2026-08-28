import type { Component, InjectionKey, Ref } from 'vue'
import { computed, defineComponent } from 'vue'

import type { CheckArgs, Definition, Permix } from '../core'
import { usePermix } from './composables'
import type { PermixContext } from './context'
import { PERMIX_CONTEXT_KEY } from './context'

export interface CheckProps<D extends Definition> {
  path: CheckArgs<D>[0]
  data?: CheckArgs<D>[1]
  reverse?: boolean
}

export interface PermixComponents<D extends Definition> {
  Check: Component<CheckProps<D>>
}

export function createComponents<D extends Definition>(
  permix: Pick<Permix<D>, 'getRules' | 'check'>,
  key: InjectionKey<Ref<PermixContext<D>>> = PERMIX_CONTEXT_KEY
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
      const { check } = usePermix(permix, key)

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
