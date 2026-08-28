import { getContext, onDestroy, setContext } from 'svelte'

import type { Definition, Permix, Rules } from '../core'
import { runCheck, runExplain } from '../core'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  isReady: boolean
  rules: Rules<T> | null
}

export const PERMIX_CONTEXT_KEY = Symbol('svelte-permix')

export function createPermixContextKey() {
  return Symbol('svelte-permix')
}

/**
 * Provides Permix context to the Svelte component tree.
 *
 * Must be called during component initialization (inside `<PermixProvider>`).
 *
 * @link https://permix.letstri.dev/docs/integrations/svelte
 */
export function providePermix<T extends Definition>(
  permix: Permix<T>,
  key: symbol = PERMIX_CONTEXT_KEY
): void {
  const context = $state<PermixContext<T>>({
    permix,
    isReady: permix.isReady(),
    rules: permix.getRules(),
  })

  setContext(key, context)

  const setup = permix.hook('setup', (instance) => {
    context.permix = instance
    context.rules = instance.getRules()
    context.isReady = instance.isReady()
  })
  const ready = permix.hook('ready', (instance) => {
    context.permix = instance
    context.rules = instance.getRules()
    context.isReady = instance.isReady()
  })

  onDestroy(() => {
    setup()
    ready()
  })
}

export function usePermixContext<T extends Definition>(
  key: symbol = PERMIX_CONTEXT_KEY
): PermixContext<T> {
  const context = getContext<PermixContext<T> | undefined>(key)

  if (!context) {
    throw new Error(
      '[Permix]: Looks like you forgot to wrap your app with <PermixProvider>'
    )
  }

  return context
}

/**
 * Access Permix check and readiness state inside a Svelte component.
 *
 * @link https://permix.letstri.dev/docs/integrations/svelte
 */
export function usePermix<T extends Definition>(
  _permix?: Pick<Permix<T>, 'getRules' | 'check'>,
  key: symbol = PERMIX_CONTEXT_KEY
) {
  const context = usePermixContext<T>(key)

  const check: Permix<T>['check'] = (...args) =>
    runCheck(context.permix, context.rules, ...args)

  const explain: Permix<T>['explain'] = (...args) =>
    runExplain(context.permix, context.rules, ...args)

  return {
    check,
    explain,
    get isReady() {
      return context.isReady
    },
  }
}
