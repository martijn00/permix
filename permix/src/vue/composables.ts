import { computed } from 'vue'

import type { Definition, Permix } from '../core'
import { runCheck, runExplain } from '../core'
import { usePermixContext } from './context'

/**
 * Access Permix check and readiness state inside a Vue component.
 *
 * @link https://permix.letstri.dev/docs/integrations/vue
 */
export function usePermix<T extends Definition>(
  _permix: Pick<Permix<T>, 'getRules' | 'check'>
) {
  const context = usePermixContext()

  const check: Permix<T>['check'] = (...args) =>
    runCheck(context.value.permix, context.value.rules, ...args)

  const explain: Permix<T>['explain'] = (...args) =>
    runExplain(context.value.permix, context.value.rules, ...args)

  return { check, explain, isReady: computed(() => context.value.isReady) }
}
