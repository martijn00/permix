import { cache, use } from 'react'

import type { Permix as PermixCore } from '../core'
import { createPermix as createPermixCore, createTemplate } from '../core'
import type { CheckArgs } from '../core/check'
import type { Definition } from '../core/definitions'
import type { Rules, RulesPaths } from '../core/permix'
import type { DehydratedState } from '../core/rules'

export type ResolveRules<D extends Definition> = () =>
  | Rules<D>
  | Promise<Rules<D>>

/**
 * Create a per-request Permix helper for the Next.js App Router.
 *
 * Pass a sync or async rules resolver. React's `cache()` memoizes one Promise
 * of a fully initialized core instance per request, so concurrent RSC callers
 * share the same setup instead of racing layout mutation order.
 *
 * Use the async getters from async Server Components, Route Handlers, and
 * Server Actions. Use `usePermix()` from non-async Server Components — it
 * unwraps the same Promise with React `use()`, so `check()` stays synchronous
 * at the call site while React may suspend only while rules resolve.
 *
 * Route Handlers and Server Actions do not share the RSC `cache()` identity.
 * Prefer an explicit core `createPermix()` + `setup()` inside each invocation
 * when those entry points must authorize independently of the render tree.
 *
 * @example
 * ```ts
 * // lib/permix.ts
 * import { createPermix } from 'permix/next'
 * import { getSession } from '@/lib/auth'
 *
 * export const permix = createPermix<{
 *   post: ['create', 'read', 'update', 'delete']
 * }>(async () => {
 *   const session = await getSession()
 *   return {
 *     post: {
 *       create: !!session,
 *       read: true,
 *       update: session?.role === 'admin',
 *       delete: session?.role === 'admin',
 *     },
 *   }
 * })
 * ```
 *
 * ```tsx
 * // async Server Component
 * const canCreate = await permix.check('post.create')
 *
 * // non-async Server Component
 * const instance = permix.usePermix()
 * const canRead = instance.check('post.read')
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/next
 */
export function createPermix<D extends Definition>(
  resolveRules: ResolveRules<D>
) {
  const getInitializedPermix = cache(async (): Promise<PermixCore<D>> => {
    const permix = createPermixCore<D>()
    permix.setup(await Promise.resolve(resolveRules()))
    return permix
  })

  function getPermix(): Promise<PermixCore<D>> {
    return getInitializedPermix()
  }

  function usePermix(): PermixCore<D> {
    return use(getInitializedPermix())
  }

  async function check(...args: CheckArgs<D>): Promise<boolean> {
    const permix = await getInitializedPermix()
    return permix.check(...args)
  }

  async function getRules(): Promise<Rules<D> | null> {
    const permix = await getInitializedPermix()
    return permix.getRules()
  }

  async function dehydrate(): Promise<DehydratedState<D>> {
    const permix = await getInitializedPermix()
    return permix.dehydrate()
  }

  function template<T = void>(rules: Rules<D> | ((param: T) => Rules<D>)) {
    return createTemplate<D, T>(rules)
  }

  return {
    getPermix,
    usePermix,
    check,
    getRules,
    dehydrate,
    template,
    $inferDefinition: undefined as unknown as D,
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

export type NextPermix<D extends Definition> = ReturnType<
  typeof createPermix<D>
>
