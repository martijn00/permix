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
import { isSamePermixFamily, runCheck } from '../core'
import type { PermixContext } from './hooks'
import {
  Context,
  readPermixContext,
  usePermixContext,
  usePermixSelector,
} from './hooks'
import { useEffectEvent } from './use-effect-event'
import { useLayoutEffect } from './use-isomorphic-layout-effect'

function createSnapshotReader<D extends Definition>(
  getPermix: () => Permix<D>,
  read: () => Pick<PermixContext<D>, 'isReady' | 'rules'>
) {
  let snapshot: PermixContext<D> | null = null

  return () => {
    const current = read()
    const permix = getPermix()
    if (
      !snapshot ||
      snapshot.permix !== permix ||
      snapshot.isReady !== current.isReady ||
      snapshot.rules !== current.rules
    ) {
      snapshot = {
        permix,
        isReady: current.isReady,
        rules: current.rules,
      }
    }
    return snapshot
  }
}

function createProviderContext<D extends Definition>(
  permix: Permix<D>
): PermixContext<D> {
  let current = permix
  const getSnapshot = createSnapshotReader(
    () => current,
    () => ({
      isReady: current.isReady(),
      rules: current.getRules(),
    })
  )
  const subscribe = (onStoreChange: () => void) => {
    const unsubSetup = permix.hook('setup', (instance) => {
      current = instance
      onStoreChange()
    })
    const unsubReady = permix.hook('ready', (instance) => {
      current = instance
      onStoreChange()
    })
    return () => {
      unsubSetup()
      unsubReady()
    }
  }

  return {
    get permix() {
      return getSnapshot().permix
    },
    get isReady() {
      return getSnapshot().isReady
    },
    get rules() {
      return getSnapshot().rules
    },
    subscribe,
    getSnapshot,
  }
}

function createHydrateContext<D extends Definition>(
  parent: PermixContext<D>,
  state: DehydratedState<D>
): PermixContext<D> {
  const getSnapshot = createSnapshotReader(
    () => readPermixContext(parent).permix,
    () => {
      const snapshot = readPermixContext(parent)
      return {
        isReady: snapshot.isReady,
        rules: snapshot.rules ?? (state as unknown as Rules<D>),
      }
    }
  )

  return {
    get permix() {
      return getSnapshot().permix
    },
    get isReady() {
      return getSnapshot().isReady
    },
    get rules() {
      return getSnapshot().rules
    },
    subscribe: (onStoreChange) =>
      parent.subscribe?.(onStoreChange) ?? (() => undefined),
    getSnapshot,
  }
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
  const value = React.useMemo(() => createProviderContext(permix), [permix])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
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

  const value = React.useMemo(
    () => createHydrateContext(parent, state),
    [parent, state]
  )

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
    const value = usePermixContext(context)

    if (
      process.env.NODE_ENV !== 'production' &&
      !isSamePermixFamily(value.permix, permix)
    ) {
      throw new Error(
        '[Permix]: usePermix must receive the same instance passed to <PermixProvider>'
      )
    }

    const hasPermission = usePermixSelector(value, (snapshot) =>
      runCheck(
        snapshot.permix,
        snapshot.rules,
        ...([path, data] as unknown as CheckArgs<D>)
      )
    )

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
