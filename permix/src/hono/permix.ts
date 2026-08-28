import type { Context, MiddlewareHandler } from 'hono'
import { createMiddleware } from 'hono/factory'

import type { Permix as PermixCore } from '../core'
import { PermixNotFoundError, withDenialReasons } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { Rules } from '../core/permix'
import { createRequestKernel, withContextKey } from '../server/kernel'
import type { MaybePromise } from '../utils'

export interface MiddlewareContext {
  c: Context
}

export interface PermixOptions<D extends Definition> {
  /**
   * Called when a `checkMiddleware` denies the request. Defaults to a 403 JSON
   * response of `{ error: 'Forbidden' }`.
   */
  onForbidden?: (
    params: CheckContext<D> & MiddlewareContext
  ) => MaybePromise<Response>
}

// Hono's TypeScript types for `c.get`/`c.set` only accept strings, but the
// runtime store handles symbols too — cast here to keep types happy.
function keyToString(key: string | symbol): string {
  return key as string
}

/**
 * Create a middleware factory that wires Permix into Hono routes.
 *
 * Use `.contextKey('name')` to set a custom context key (defaults to a unique
 * `Symbol('permix')`).
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { createPermix } from 'permix/hono'
 *
 * const permix = createPermix<{
 *   post: ['create', 'read']
 * }>()
 *
 * const app = new Hono()
 * app.use(permix.setupMiddleware(({ c }) => ({
 *   post: { create: true, read: true },
 * })))
 *
 * app.get('/posts', permix.checkMiddleware('post.read'), c => c.json({ ok: true }))
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/hono
 */
export function createPermix<D extends Definition>(
  options: PermixOptions<D> = {}
) {
  const onForbidden =
    options.onForbidden ?? (({ c }) => c.json({ error: 'Forbidden' }, 403))

  return withContextKey((resolveKey) => {
    const kernel = createRequestKernel<D, Context>(resolveKey, {
      get: (c) => c.get(keyToString(resolveKey())) as PermixCore<D> | undefined,
      set: (c, instance) => {
        c.set(keyToString(resolveKey()), instance)
      },
    })

    function setupMiddleware(
      callbackOrRules:
        | ((context: MiddlewareContext) => MaybePromise<Rules<D>>)
        | Rules<D>
    ): MiddlewareHandler {
      return createMiddleware(async (c, next) => {
        const rules =
          typeof callbackOrRules === 'function'
            ? await callbackOrRules({ c })
            : callbackOrRules
        kernel.attach(c, rules)
        await next()
      })
    }

    const checkMiddleware: (...args: CheckArgs<D>) => MiddlewareHandler = (
      ...args
    ) =>
      createMiddleware(async (c, next) => {
        const permix = kernel.get(c)

        if (!permix) {
          throw new PermixNotFoundError(resolveKey())
        }

        const allowed = permix.check(...args)

        if (!allowed) {
          return await onForbidden({ c, ...withDenialReasons(permix, args) })
        }

        // oxlint-disable-next-line typescript/no-confusing-void-expression -- Hono's next() is Promise<void>
        return await next()
      })

    return {
      setupMiddleware,
      checkMiddleware,
      template: kernel.template,
      get: kernel.get,
      getOrThrow: kernel.getOrThrow,
      getRules: kernel.getRules,
      hook: kernel.hook,
      hookOnce: kernel.hookOnce,
      get key() {
        return kernel.key
      },
      $inferDefinition: kernel.$inferDefinition,
      $inferPath: kernel.$inferPath,
    }
  })
}

/** Return type of {@link createPermix}. */
export type HonoPermix<D extends Definition> = ReturnType<
  typeof createPermix<D>
>
