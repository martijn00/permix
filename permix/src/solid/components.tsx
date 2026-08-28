import type { JSX } from 'solid-js'
import {
  createMemo,
  createRenderEffect,
  createSignal,
  onCleanup,
} from 'solid-js'

import type {
  CheckArgs,
  DataAtPath,
  Definition,
  DehydratedState,
  Permix,
  RulesPaths,
} from '../core'
import type { PermixContext } from './hooks'
import { Context, usePermix, usePermixContext } from './hooks'

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

  const context: PermixContext<D> = {
    permix: props.permix,
    get isReady() {
      return isReady()
    },
    get rules() {
      return rules()
    },
  }

  createRenderEffect(() => {
    const setup = props.permix.hook('setup', () => {
      setRules(() => props.permix.getRules())
    })
    const ready = props.permix.hook('ready', () => {
      setIsReady(props.permix.isReady())
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

export function PermixHydrate(props: {
  children: JSX.Element
  state: DehydratedState<any>
}) {
  const context = usePermixContext()

  createRenderEffect(() => {
    context.permix.hydrate(props.state)
  })

  return props.children
}

export interface CheckProps<D extends Definition, P extends RulesPaths<D>> {
  path: P
  data?: DataAtPath<D, P>[0]
  children: JSX.Element
  otherwise?: JSX.Element
  reverse?: boolean
}

export interface PermixComponents<D extends Definition> {
  Check: <P extends RulesPaths<D>>(props: CheckProps<D, P>) => JSX.Element
}

export function createComponents<D extends Definition>(
  permix: Pick<Permix<D>, 'getRules' | 'check'>
): PermixComponents<D> {
  function Check<P extends RulesPaths<D>>(
    props: CheckProps<D, P>
  ): JSX.Element {
    const context = usePermix(permix)
    const hasPermission = createMemo(() =>
      context.check(...([props.path, props.data] as unknown as CheckArgs<D>))
    )

    return (
      <>
        {props.reverse
          ? hasPermission()
            ? props.otherwise || null
            : props.children
          : hasPermission()
            ? props.children
            : props.otherwise || null}
      </>
    )
  }

  return {
    Check,
  }
}
