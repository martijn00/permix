import type { IncomingMessage, ServerResponse } from 'node:http'

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

type NextFunction = (err?: unknown) => void

export type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction
) => Promise<void>

export interface MiddlewareContext {
  req: IncomingMessage
  res: ServerResponse
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
 * Create a middleware factory that wires Permix into raw Node.js HTTP servers.
 *
 * Use `.contextKey('name')` to set a custom request key (defaults to a unique
 * `Symbol('permix')`).
 *
 * @example
 * ```ts
 * import http from 'node:http'
 * import { createPermix } from 'permix/node'
 *
 * const permix = createPermix<{
 *   post: ['create', 'read']
 * }>()
 *
 * const setupPermix = permix.setupMiddleware(({ req }) => ({
 *   post: { create: true, read: true },
 * }))
 *
 * http.createServer(async (req, res) => {
 *   await setupPermix(req, res, () => {})
 *   permix.getOrThrow(req).check('post.read') // true
 *   res.end('ok')
 * }).listen(3000)
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/node
 */
export function createPermix<D extends Definition>(
  options: PermixOptions<D> = {}
) {
  const onForbidden =
    options.onForbidden ??
    (({ res }) => {
      res.statusCode = 403
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Forbidden' }))
    })

  return withContextKey((resolveKey) => {
    const kernel = createRequestKernel<D, IncomingMessage>(
      resolveKey,
      propertyBagStore(resolveKey)
    )

    function get(req: IncomingMessage): PermixCore<D> | null {
      return kernel.get(req)
    }

    function getOrThrow(req: IncomingMessage): PermixCore<D> {
      return kernel.getOrThrow(req)
    }

    function getRules(req: IncomingMessage): Rules<D> | null {
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

export type NodePermix<D extends Definition> = ReturnType<
  typeof createPermix<D>
>
