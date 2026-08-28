import type { JSX } from 'solid-js'
import { createRenderEffect, createSignal, onCleanup, untrack } from 'solid-js'

import type { Definition, DehydratedState, Permix, Rules } from '../core'
import { createPermix as createPermixCore } from '../core'
import type { PermixComponents } from './components'
import { createComponents } from './components'
import type { PermixContext } from './hooks'
import {
  createPermixContext,
  usePermix as usePermixFromContext,
  usePermixContext,
} from './hooks'

export interface CreatePermixResult<D extends Definition> {
  permix: Permix<D>
  PermixProvider: (props: { children: JSX.Element }) => JSX.Element
  PermixHydrate: (props: {
    children: JSX.Element
    state: DehydratedState<D>
  }) => JSX.Element
  usePermix: () => {
    check: Permix<D>['check']
    explain: Permix<D>['explain']
    isReady: () => boolean
  }
  Check: PermixComponents<D>['Check']
}

/**
 * Create a Permix instance with isolated Solid bindings.
 *
 * Call once at module scope. The bound provider does not take a `permix`
 * prop. `usePermix()` takes no instance argument.
 *
 * @link https://permix.letstri.dev/docs/integrations/solid
 */
export function createPermix<D extends Definition>(
  instance?: Permix<D>
): CreatePermixResult<D> {
  const permix = instance ?? createPermixCore<D>()
  const context = createPermixContext<D>()
  const { Check } = createComponents(permix, context)

  function BoundProvider(props: { children: JSX.Element }) {
    const [isReady, setIsReady] = createSignal(permix.isReady())
    const [rules, setRules] = createSignal(permix.getRules())
    const [current, setCurrent] = createSignal(permix)

    const value: PermixContext<D> = {
      get permix() {
        return current()
      },
      get isReady() {
        return isReady()
      },
      get rules() {
        return rules()
      },
    }

    createRenderEffect(() => {
      const setup = permix.hook('setup', (next) => {
        setCurrent(() => next)
        setRules(() => next.getRules())
        setIsReady(next.isReady())
      })
      const ready = permix.hook('ready', (next) => {
        setCurrent(() => next)
        setRules(() => next.getRules())
        setIsReady(next.isReady())
      })

      onCleanup(() => {
        setup()
        ready()
      })
    })

    // oxlint-disable-next-line react/jsx-no-constructed-context-values
    return <context.Provider value={value}>{props.children}</context.Provider>
  }

  function BoundHydrate(props: {
    children: JSX.Element
    state: DehydratedState<D>
  }) {
    const parent = usePermixContext(context)
    const nested: PermixContext<D> = {
      get permix() {
        return parent.permix
      },
      get isReady() {
        return parent.isReady
      },
      get rules() {
        return parent.rules ?? (props.state as unknown as Rules<D>)
      },
    }

    createRenderEffect(() => {
      const next = props.state
      untrack(() => {
        parent.permix.hydrate(next)
      })
    })

    // oxlint-disable-next-line react/jsx-no-constructed-context-values
    return <context.Provider value={nested}>{props.children}</context.Provider>
  }

  function useBoundPermix() {
    return usePermixFromContext(permix, context)
  }

  return {
    permix,
    PermixProvider: BoundProvider,
    PermixHydrate: BoundHydrate,
    usePermix: useBoundPermix,
    Check,
  }
}
