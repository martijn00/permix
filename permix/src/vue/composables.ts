import type { InjectionKey, Ref } from 'vue'
import { computed } from 'vue'

import type { Definition, Permix } from '../core'
import { runCheck, runExplain } from '../core'
import type { PermixContext } from './context'
import { PERMIX_CONTEXT_KEY, usePermixContext } from './context'

/**
 * Access Permix check and readiness state inside a Vue component.
 *
 * @link https://permix.letstri.dev/docs/integrations/vue
 */
export function usePermix<T extends Definition>(
  _permix?: Pick<Permix<T>, 'getRules' | 'check'>,
  key: InjectionKey<Ref<PermixContext<T>>> = PERMIX_CONTEXT_KEY
) {
  const context = usePermixContext(key)

  const check: Permix<T>['check'] = (...args) =>
    runCheck(context.value.permix, context.value.rules, ...args)

  const explain: Permix<T>['explain'] = (...args) =>
    runExplain(context.value.permix, context.value.rules, ...args)

  return { check, explain, isReady: computed(() => context.value.isReady) }
}
