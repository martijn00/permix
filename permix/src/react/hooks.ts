import * as React from 'react'

import type { Definition, Permix, Rules } from '../core'
import { createCheck } from '../core'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  isReady: boolean
  rules: Rules<T> | null
}

export function createPermixContext<D extends Definition>() {
  return React.createContext<PermixContext<D> | null>(null)
}

export const Context = createPermixContext<Definition>()

export function usePermixContext<D extends Definition = Definition>(
  context?: React.Context<PermixContext<D> | null>
): PermixContext<D> {
  const value = React.useContext(
    context ?? (Context as React.Context<PermixContext<D> | null>)
  )

  if (!value) {
    throw new Error(
      '[Permix]: Looks like you forgot to wrap your app with <PermixProvider>'
    )
  }

  return value
}

/**
 * Access Permix check and readiness state inside a React component.
 *
 * @link https://permix.letstri.dev/docs/integrations/react
 */
export function usePermix<T extends Definition>(
  permix: Pick<Permix<T>, 'getRules' | 'check'>,
  context?: React.Context<PermixContext<T> | null>
) {
  const { isReady, rules, permix: provided } = usePermixContext(context)

  const nodeProcess = (
    globalThis as typeof globalThis & {
      process?: { env?: { NODE_ENV?: string } }
    }
  ).process

  if (nodeProcess?.env?.NODE_ENV !== 'production' && provided !== permix) {
    throw new Error(
      '[Permix]: usePermix must receive the same instance passed to <PermixProvider>'
    )
  }

  const check: Permix<T>['check'] = React.useCallback(
    (...args) => createCheck<T>(() => rules ?? permix.getRules())(...args),
    [rules, permix]
  )

  return { check, isReady }
}
