import { createContext, useContext } from 'solid-js'
import type { Context as SolidContext } from 'solid-js'

import type { Definition, Permix, Rules } from '../core'
import { runCheck, runExplain } from '../core'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  readonly isReady: boolean
  readonly rules: Rules<T> | null
}

export function createPermixContext<D extends Definition>() {
  return createContext<PermixContext<D> | null>(null)
}

export const Context = createContext<PermixContext<any>>(null!)

export function usePermixContext<D extends Definition = Definition>(
  context?: SolidContext<PermixContext<D> | null>
) {
  const value = useContext(
    context ?? (Context as SolidContext<PermixContext<D> | null>)
  )

  if (!value) {
    throw new Error(
      '[Permix]: Looks like you forgot to wrap your app with <PermixProvider>'
    )
  }

  return value
}

/**
 * Access Permix check and readiness state inside a Solid component.
 *
 * @link https://permix.letstri.dev/docs/integrations/solid
 */
export function usePermix<T extends Definition>(
  _permix?: Pick<Permix<T>, 'getRules' | 'check'>,
  context?: SolidContext<PermixContext<T> | null>
) {
  const value = usePermixContext(context)

  const check: Permix<T>['check'] = (...args) =>
    runCheck(value.permix, value.rules, ...args)

  const explain: Permix<T>['explain'] = (...args) =>
    runExplain(value.permix, value.rules, ...args)

  return { check, explain, isReady: () => value.isReady }
}
