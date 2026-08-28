import type { Permix as PermixCore } from '../core'
import { PermixNotFoundError, withDenialReasons } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { Rules } from '../core/permix'
import type { MaybePromise } from '../utils'
import { createRequestKernel, propertyBagStore, withContextKey } from './kernel'

export type NextFunction = () => MaybePromise<Response>

/**
 * Fetch middleware compatible with [srvx](https://srvx.h3.dev/guide/middleware)
 * and other web-standard server handlers.
 */
export type Middleware = (
  req: Request,
  next: NextFunction
) => MaybePromise<Response>

export interface MiddlewareContext {
  req: Request
  next: NextFunction
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

/**
 * Create a middleware factory that wires Permix into fetch-style request handlers.
 *
 * Middleware follows the web-standard `(req, next) => Response` pattern used by
 * [srvx](https://github.com/h3js/srvx) and similar runtimes.
 *
 * Call `.contextKey('name')` to set a custom request key. Omit it to use a
 * fresh `Symbol('permix')` as the default key.
 *
 * @example
 * ```ts
 * import { serve } from 'srvx'
 * import { createPermix } from 'permix/server'
 *
 * const permix = createPermix<Def>()
 *
 * serve({
 *   middleware: [
 *     permix.setupMiddleware(({ req }) => ({
 *       post: { create: true, read: true, update: false, delete: false },
 *     })),
 *   ],
 *   fetch(req) {
 *     return permix.checkMiddleware('post.create')(req, () =>
 *       Response.json({ ok: true }),
 *     )
 *   },
 * })
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/server
 */
export function createPermix<D extends Definition>(
  options: PermixOptions<D> = {}
) {
  const onForbidden =
    options.onForbidden ??
    (() =>
      new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }))

  return withContextKey((resolveKey) => {
    const kernel = createRequestKernel<D, Request>(
      resolveKey,
      propertyBagStore(resolveKey)
    )

    function get(req: Request): PermixCore<D> | null {
      return kernel.get(req)
    }

    function getOrThrow(req: Request): PermixCore<D> {
      return kernel.getOrThrow(req)
    }

    function getRules(req: Request): Rules<D> | null {
      return kernel.getRules(req)
    }

    function setupMiddleware(
      callbackOrRules:
        | ((context: MiddlewareContext) => MaybePromise<Rules<D>>)
        | Rules<D>
    ): Middleware {
      return async (req, next) => {
        const rules =
          typeof callbackOrRules === 'function'
            ? await callbackOrRules({ req, next })
            : callbackOrRules
        kernel.attach(req, rules)
        return await next()
      }
    }

    const checkMiddleware: (...args: CheckArgs<D>) => Middleware =
      (...args) =>
      async (req, next) => {
        const permix = get(req)

        if (!permix) {
          throw new PermixNotFoundError(resolveKey())
        }

        const allowed = permix.check(...args)

        if (!allowed) {
          return await onForbidden({
            req,
            next,
            ...withDenialReasons(permix, args),
          })
        }

        return await next()
      }

    return {
      setupMiddleware,
      checkMiddleware,
      template: kernel.template,
      get,
      getOrThrow,
      getRules,
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

export type ServerPermix<D extends Definition> = ReturnType<
  typeof createPermix<D>
>
