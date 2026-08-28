import type { Handler, NextFunction, Request, Response } from 'express'

import type { Permix as PermixCore } from '../core'
import { PermixNotFoundError, withDenialReasons } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { Rules } from '../core/permix'
import {
  createRequestKernel,
  propertyBagStore,
  withContextKey,
} from '../server/kernel'
import type { MaybePromise } from '../utils'

export interface MiddlewareContext {
  req: Request
  res: Response
  next: NextFunction
}

export interface PermixOptions<D extends Definition> {
  /**
   * Called when a `checkMiddleware` denies the request. Defaults to a 403 JSON
   * response of `{ error: 'Forbidden' }`.
   */
  onForbidden?: (
    params: CheckContext<D> & MiddlewareContext
  ) => MaybePromise<void>
}

/**
 * Create a middleware factory that wires Permix into Express routes.
 *
 * Use `.contextKey('name')` to set a custom request key (defaults to a unique
 * `Symbol('permix')`).
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { createPermix } from 'permix/express'
 *
 * const permix = createPermix<{
 *   post: ['create', 'read']
 * }>()
 *
 * const app = express()
 * app.use(permix.setupMiddleware(({ req }) => ({
 *   post: { create: !!req.user, read: true },
 * })))
 *
 * app.get('/posts', permix.checkMiddleware('post.read'), (req, res) => {
 *   res.json({ ok: true })
 * })
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/express
 */
export function createPermix<D extends Definition>(
  options: PermixOptions<D> = {}
) {
  const onForbidden =
    options.onForbidden ??
    (({ res }) => {
      res.status(403).json({ error: 'Forbidden' })
    })

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
    ): Handler {
      return async (req, res, next) => {
        try {
          const rules =
            typeof callbackOrRules === 'function'
              ? await callbackOrRules({ req, res, next })
              : callbackOrRules
          kernel.attach(req, rules)
          next()
        } catch (error) {
          next(error)
        }
      }
    }

    const checkMiddleware: (...args: CheckArgs<D>) => Handler =
      (...args) =>
      async (req, res, next) => {
        try {
          const permix = get(req)

          if (!permix) {
            next(new PermixNotFoundError(resolveKey()))
            return
          }

          const allowed = permix.check(...args)

          if (!allowed) {
            await onForbidden({
              req,
              res,
              next,
              ...withDenialReasons(permix, args),
            })
            return
          }

          next()
        } catch (error) {
          next(error)
        }
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

export type ExpressPermix<D extends Definition> = ReturnType<
  typeof createPermix<D>
>
