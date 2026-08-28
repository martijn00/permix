import type { InjectionKey, Ref } from 'vue'
import { inject, provide, ref } from 'vue'

import type { Definition, Permix, Rules } from '../core'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  isReady: boolean
  rules: Rules<T> | null
}

const PERMIX_CONTEXT_KEY = Symbol('vue-permix') as InjectionKey<
  Ref<PermixContext<any>>
>

export function providePermixContext(permix: Permix<any>) {
  if (!permix) {
    throw new Error(
      '[Permix]: Looks like you forgot to provide the permix instance to PermixProvider'
    )
  }

  const context = ref({
    permix,
    rules: permix.getRules(),
    isReady: permix.isReady(),
  })

  provide(PERMIX_CONTEXT_KEY, context)

  const setup = permix.hook('setup', (instance) => {
    context.value = {
      permix: instance,
      rules: instance.getRules(),
      isReady: instance.isReady(),
    }
  })

  const ready = permix.hook('ready', (instance) => {
    context.value = {
      permix: instance,
      rules: instance.getRules(),
      isReady: instance.isReady(),
    }
  })

  return () => {
    setup()
    ready()
  }
}

export function usePermixContext<T extends Definition = any>() {
  const context = inject(PERMIX_CONTEXT_KEY)

  if (!context) {
    throw new Error(
      '[Permix]: Looks like you forgot to wrap your app with <PermixProvider>'
    )
  }

  return context as Ref<PermixContext<T>>
}
