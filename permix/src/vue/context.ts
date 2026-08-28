import type { InjectionKey, Ref } from 'vue'
import { inject, provide, ref } from 'vue'

import type { Definition, Permix, Rules } from '../core'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  isReady: boolean
  rules: Rules<T> | null
}

export const PERMIX_CONTEXT_KEY = Symbol('vue-permix') as InjectionKey<
  Ref<PermixContext<any>>
>

export function createPermixInjectionKey<D extends Definition>() {
  return Symbol('vue-permix') as InjectionKey<Ref<PermixContext<D>>>
}

export function providePermixContext(
  permix: Permix<any>,
  key: InjectionKey<Ref<PermixContext<any>>> = PERMIX_CONTEXT_KEY
) {
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

  provide(key, context)

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

export function usePermixContext<T extends Definition = any>(
  key: InjectionKey<Ref<PermixContext<T>>> = PERMIX_CONTEXT_KEY
) {
  const context = inject(key)

  if (!context) {
    throw new Error(
      '[Permix]: Looks like you forgot to wrap your app with <PermixProvider>'
    )
  }

  return context
}
