import type { Component, Snippet } from 'svelte'

import type { Definition, DehydratedState, Permix } from '../core'
import { createPermix as createPermixCore } from '../core'
import Check from './Check.svelte'
import type { CheckProps, PermixComponents } from './components'
import {
  createPermixContextKey,
  usePermix as usePermixFromContext,
} from './context.svelte'
import PermixHydrate from './PermixHydrate.svelte'
import PermixProvider from './PermixProvider.svelte'

export interface CreatePermixResult<D extends Definition> {
  permix: Permix<D>
  PermixProvider: Component<{ children: Snippet }>
  PermixHydrate: Component<{ children: Snippet; state: DehydratedState<D> }>
  usePermix: () => {
    check: Permix<D>['check']
    explain: Permix<D>['explain']
    readonly isReady: boolean
  }
  Check: PermixComponents<D>['Check']
}

/**
 * Create a Permix instance with isolated Svelte bindings.
 *
 * Call once at module scope. The bound provider does not take a `permix`
 * prop. `usePermix()` takes no instance argument.
 *
 * @link https://permix.letstri.dev/docs/integrations/svelte
 */
export function createPermix<D extends Definition>(
  instance?: Permix<D>
): CreatePermixResult<D> {
  const permix = instance ?? createPermixCore<D>()
  const key = createPermixContextKey()

  const BoundProvider = ((
    $$anchor: unknown,
    $$props: { children: Snippet }
  ) => {
    PermixProvider($$anchor as never, {
      get permix() {
        return permix
      },
      get children() {
        return $$props.children
      },
      contextKey: key,
    })
  }) as Component<{ children: Snippet }>

  const BoundHydrate = ((
    $$anchor: unknown,
    $$props: { children: Snippet; state: DehydratedState<D> }
  ) => {
    PermixHydrate($$anchor as never, {
      get state() {
        return $$props.state
      },
      get children() {
        return $$props.children
      },
      contextKey: key,
    })
  }) as Component<{ children: Snippet; state: DehydratedState<D> }>

  const BoundCheck = (($$anchor: unknown, $$props: CheckProps<D, any>) => {
    Check(
      $$anchor as never,
      {
        get path() {
          return $$props.path
        },
        get data() {
          return $$props.data
        },
        get reverse() {
          return $$props.reverse ?? false
        },
        get children() {
          return $$props.children
        },
        get otherwise() {
          return $$props.otherwise
        },
        contextKey: key,
      } as never
    )
  }) as PermixComponents<D>['Check']

  function useBoundPermix() {
    return usePermixFromContext(permix, key)
  }

  return {
    permix,
    PermixProvider: BoundProvider,
    PermixHydrate: BoundHydrate,
    usePermix: useBoundPermix,
    Check: BoundCheck,
  }
}
