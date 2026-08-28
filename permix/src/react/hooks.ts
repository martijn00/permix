import * as React from 'react'

import type { Definition, Permix, Rules } from '../core'
import { isSamePermixFamily, runCheck, runExplain } from '../core'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  isReady: boolean
  rules: Rules<T> | null
  subscribe?: (onStoreChange: () => void) => () => void
  getSnapshot?: () => PermixContext<T>
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

const noop = () => undefined
const noopSubscribe = () => noop
const selectSnapshot = <D extends Definition>(value: PermixContext<D>) => value

export function readPermixContext<D extends Definition>(
  value: PermixContext<D>
): PermixContext<D> {
  return value.getSnapshot?.() ?? value
}

export function usePermixSelector<D extends Definition, S>(
  value: PermixContext<D>,
  selector: (snapshot: PermixContext<D>) => S
): S {
  return React.useSyncExternalStore(
    value.subscribe ?? noopSubscribe,
    () => selector(readPermixContext(value)),
    () => selector(readPermixContext(value))
  )
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
  const value = usePermixContext(context)
  const {
    isReady,
    rules,
    permix: provided,
  } = usePermixSelector(value, selectSnapshot)

  if (
    process.env.NODE_ENV !== 'production' &&
    !isSamePermixFamily(provided, permix)
  ) {
    throw new Error(
      '[Permix]: usePermix must receive the same instance passed to <PermixProvider>'
    )
  }

  const check: Permix<T>['check'] = React.useCallback(
    (...args) => runCheck(provided, rules, ...args),
    [rules, provided]
  )

  const explain: Permix<T>['explain'] = React.useCallback(
    (...args) => runExplain(provided, rules, ...args),
    [rules, provided]
  )

  return { check, explain, isReady }
}
