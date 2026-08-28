import * as React from 'react'

import type {
  CheckArgs,
  DataAtPath,
  Definition,
  DehydratedState,
  Permix,
  Rules,
  RulesPaths,
} from '../core'
import type { PermixContext } from './hooks'
import { Context, usePermix, usePermixContext } from './hooks'
import { useEffectEvent } from './use-effect-event'
import { useLayoutEffect } from './use-isomorphic-layout-effect'

function readPermixSnapshot<D extends Definition>(
  permix: Permix<D>
): PermixContext<D> {
  return {
    permix,
    isReady: permix.isReady(),
    rules: permix.getRules(),
  }
}

function snapshotsEqual<D extends Definition>(
  left: PermixContext<D>,
  right: PermixContext<D>
): boolean {
  return (
    left.permix === right.permix &&
    left.isReady === right.isReady &&
    left.rules === right.rules
  )
}

/**
 * Provides Permix context to the React component tree.
 *
 * @link https://permix.letstri.dev/docs/integrations/react
 */
export function PermixProvider<D extends Definition>({
  children,
  permix,
  context,
}: {
  children: React.ReactNode
  permix: Permix<D>
  context?: React.Context<PermixContext<D> | null>
}) {
  const Ctx = context ?? (Context as React.Context<PermixContext<D> | null>)
  const snapshotRef = React.useRef<PermixContext<D> | null>(null)

  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const unsubSetup = permix.hook('setup', onStoreChange)
      const unsubReady = permix.hook('ready', onStoreChange)
      onStoreChange()
      return () => {
        unsubSetup()
        unsubReady()
      }
    },
    [permix]
  )

  const getSnapshot = React.useCallback(() => {
    const next = readPermixSnapshot(permix)
    const prev = snapshotRef.current
    if (prev && snapshotsEqual(prev, next)) {
      return prev
    }
    snapshotRef.current = next
    return next
  }, [permix])

  const snapshot = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  )

  return <Ctx.Provider value={snapshot}>{children}</Ctx.Provider>
}

export function PermixHydrate<D extends Definition>({
  children,
  state,
  context,
}: {
  children: React.ReactNode
  state: DehydratedState<D>
  context?: React.Context<PermixContext<D> | null>
}) {
  const Ctx = context ?? (Context as React.Context<PermixContext<D> | null>)
  const parent = usePermixContext(context)

  const hydrateEvent = useEffectEvent((nextState: DehydratedState<D>) => {
    parent.permix.hydrate(nextState)
  })

  useLayoutEffect(() => {
    hydrateEvent(state)
  }, [state])

  const overlay = React.useMemo<PermixContext<D>>(
    () => ({
      permix: parent.permix,
      isReady: parent.isReady,
      rules: state as unknown as Rules<D>,
    }),
    [parent.permix, parent.isReady, state]
  )

  const value = parent.rules === null ? overlay : parent

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export interface CheckProps<D extends Definition, P extends RulesPaths<D>> {
  path: P
  data?: DataAtPath<D, P>[0]
  children: React.ReactNode
  otherwise?: React.ReactNode
  reverse?: boolean
}

export interface PermixComponents<D extends Definition> {
  Check: <P extends RulesPaths<D>>(props: CheckProps<D, P>) => React.ReactNode
}

export function createComponents<D extends Definition>(
  permix: Pick<Permix<D>, 'getRules' | 'check'>,
  context?: React.Context<PermixContext<D> | null>
): PermixComponents<D> {
  function Check<P extends RulesPaths<D>>({
    children,
    path,
    data,
    otherwise = null,
    reverse = false,
  }: CheckProps<D, P>) {
    const { check } = usePermix(permix, context)

    const hasPermission = check(...([path, data] as unknown as CheckArgs<D>))
    return reverse
      ? hasPermission
        ? otherwise
        : children
      : hasPermission
        ? children
        : otherwise
  }

  Check.displayName = 'Check'

  return {
    Check,
  }
}
