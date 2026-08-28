import { computed } from 'vue'

import type { Definition, Permix, Rules } from '../core'
import { createCheck } from '../core'
import { usePermixContext } from './context'

/**
 * Access Permix check and readiness state inside a Vue component.
 *
 * @link https://permix.letstri.dev/docs/integrations/vue
 */
export function usePermix<T extends Definition>(
  permix: Pick<Permix<T>, 'getRules' | 'check'>
) {
  const context = usePermixContext()

  const check: Permix<T>['check'] = createCheck<T>(
    () => (context.value.rules ?? permix.getRules()) as Rules<T> | null
  )

  return { check, isReady: computed(() => context.value.isReady) }
}
