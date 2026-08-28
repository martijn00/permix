import type { JSX } from 'solid-js'
import { createRenderEffect, createSignal, onCleanup, untrack } from 'solid-js'

import type { Definition, DehydratedState, Permix, Rules } from '../core'
import type { PermixContext } from './hooks'
import { Context, usePermixContext } from './hooks'

/**
 * Provides Permix context to the Solid component tree.
 *
 * Frozen rule snapshots cannot live in a Solid store (deep unwrap loops),
 * so readiness and rules are signals with getters on the context object.
 *
 * @link https://permix.letstri.dev/docs/integrations/solid
 */
export function PermixProvider<D extends Definition>(props: {
  children: JSX.Element
  permix: Permix<D>
}): JSX.Element {
  const [isReady, setIsReady] = createSignal(props.permix.isReady())
  const [rules, setRules] = createSignal(props.permix.getRules())
  const [instance, setInstance] = createSignal(props.permix)

  const context: PermixContext<D> = {
    get permix() {
      return instance()
    },
    get isReady() {
      return isReady()
    },
    get rules() {
      return rules()
    },
  }

  createRenderEffect(() => {
    const setup = props.permix.hook('setup', (next) => {
      setInstance(() => next)
      setRules(() => next.getRules())
      setIsReady(next.isReady())
    })
    const ready = props.permix.hook('ready', (next) => {
      setInstance(() => next)
      setRules(() => next.getRules())
      setIsReady(next.isReady())
    })

    onCleanup(() => {
      setup()
      ready()
    })
  })

  // Solid setup runs once; getters read signals so this object is stable.
  // oxlint-disable-next-line react/jsx-no-constructed-context-values
  return <Context.Provider value={context}>{props.children}</Context.Provider>
}

export function PermixHydrate<D extends Definition>(props: {
  children: JSX.Element
  state: DehydratedState<D>
}) {
  const parent = usePermixContext<D>()
  const overlay = () => props.state as unknown as Rules<D>

  const context: PermixContext<D> = {
    get permix() {
      return parent.permix
    },
    get isReady() {
      return parent.isReady
    },
    get rules() {
      return parent.rules ?? overlay()
    },
  }

  createRenderEffect(() => {
    const next = props.state
    untrack(() => {
      parent.permix.hydrate(next)
    })
  })

  // oxlint-disable-next-line react/jsx-no-constructed-context-values
  return <Context.Provider value={context}>{props.children}</Context.Provider>
}
