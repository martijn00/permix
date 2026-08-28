import { createContext, useContext } from 'solid-js'

import type { Definition, Permix, Rules } from '../core'
import { runCheck } from '../core'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  readonly isReady: boolean
  readonly rules: Rules<T> | null
}

export const Context = createContext<PermixContext<any>>(null!)

export function usePermixContext() {
  const context = useContext(Context)

  if (!context) {
    throw new Error(
      '[Permix]: Looks like you forgot to wrap your app with <PermixProvider>'
    )
  }

  return context
}

/**
 * Access Permix check and readiness state inside a Solid component.
 *
 * @link https://permix.letstri.dev/docs/integrations/solid
 */
export function usePermix<T extends Definition>(
  _permix: Pick<Permix<T>, 'getRules' | 'check'>
) {
  const context = usePermixContext()

  const check: Permix<T>['check'] = (...args) =>
    runCheck(context.permix, context.rules, ...args)

  return { check, isReady: () => context.isReady }
}
