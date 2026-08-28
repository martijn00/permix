import type { ReactNode } from 'react'

import type { Definition, DehydratedState, Permix } from '../core'
import { createPermix as createPermixCore } from '../core'
import type { PermixComponents } from './components'
import { createComponents, PermixHydrate, PermixProvider } from './components'
import { createPermixContext, usePermix as usePermixFromContext } from './hooks'

export interface CreatePermixResult<D extends Definition> {
  permix: Permix<D>
  PermixProvider: (props: { children: ReactNode }) => ReactNode
  PermixHydrate: (props: {
    children: ReactNode
    state: DehydratedState<D>
  }) => ReactNode
  usePermix: () => {
    check: Permix<D>['check']
    isReady: boolean
  }
  Check: PermixComponents<D>['Check']
}

/**
 * Create a Permix instance with isolated React bindings.
 *
 * Call once at module scope, same as `createPermix` from `permix/next` or
 * `permix/express`. Pass an existing core instance to wrap it instead of
 * creating a new one.
 *
 * @link https://permix.letstri.dev/docs/integrations/react
 */
export function createPermix<D extends Definition>(
  instance?: Permix<D>
): CreatePermixResult<D> {
  const permix = instance ?? createPermixCore<D>()
  const context = createPermixContext<D>()
  const { Check } = createComponents(permix, context)

  function BoundProvider({ children }: { children: ReactNode }) {
    return (
      <PermixProvider permix={permix} context={context}>
        {children}
      </PermixProvider>
    )
  }

  function BoundHydrate({
    children,
    state,
  }: {
    children: ReactNode
    state: DehydratedState<D>
  }) {
    return (
      <PermixHydrate state={state} context={context}>
        {children}
      </PermixHydrate>
    )
  }

  function useBoundPermix() {
    return usePermixFromContext(permix, context)
  }

  BoundProvider.displayName = 'PermixProvider'
  BoundHydrate.displayName = 'PermixHydrate'

  return {
    permix,
    PermixProvider: BoundProvider,
    PermixHydrate: BoundHydrate,
    usePermix: useBoundPermix,
    Check,
  }
}
