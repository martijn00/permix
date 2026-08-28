import type { Permix as PermixCore } from '../core'
import {
  createHooks,
  createPermix as createPermixCore,
  createTemplate,
  PermixNotFoundError,
} from '../core'
import type { Definition } from '../core/definitions'
import type { PermixHooks, Rules, RulesPaths } from '../core/permix'

/**
 * How a request-scoped kernel reads and writes the Permix instance on a
 * framework store (Express `req`, Hono `c`, Fetch `Request`, …).
 */
export interface RequestKernelStore<D extends Definition, Store> {
  get: (store: Store) => PermixCore<D> | null | undefined
  set: (store: Store, instance: PermixCore<D>) => void
}

/**
 * Read/write the instance as a property on the request object. Frameworks
 * without a typed bag (Express, Node `IncomingMessage`, Fetch `Request`)
 * use this; Hono uses `c.get`/`c.set` instead.
 */
export function propertyBagStore<D extends Definition, Store>(
  resolveKey: () => string | symbol
): RequestKernelStore<D, Store> {
  return {
    get: (container) =>
      (container as unknown as Record<string | symbol, PermixCore<D>>)[
        resolveKey()
      ],
    set: (container, instance) => {
      ;(container as unknown as Record<string | symbol, PermixCore<D>>)[
        resolveKey()
      ] = instance
    },
  }
}

/**
 * Shared get / attach / hook loop for HTTP adapters. Framework files wrap
 * this with middleware signatures and `onForbidden` handlers.
 */
export function createRequestKernel<D extends Definition, Store>(
  resolveKey: () => string | symbol,
  store: RequestKernelStore<D, Store>
) {
  const hooks = createHooks<PermixHooks<D>>()

  function get(container: Store): PermixCore<D> | null {
    return store.get(container) ?? null
  }

  function getOrThrow(container: Store): PermixCore<D> {
    const instance = get(container)
    if (!instance) {
      throw new PermixNotFoundError(resolveKey())
    }
    return instance
  }

  function attach(container: Store, rules: Rules<D>): PermixCore<D> {
    const instance = createPermixCore<D>().setup(rules)
    instance.hook('check', (context) => {
      hooks.callHook('check', context)
    })
    store.set(container, instance)
    return instance
  }

  function getRules(container: Store): Rules<D> | null {
    return get(container)?.getRules() ?? null
  }

  function template<T = void>(rules: Rules<D> | ((param: T) => Rules<D>)) {
    return createTemplate<D, T>(rules)
  }

  return {
    get,
    getOrThrow,
    attach,
    getRules,
    template,
    hook: hooks.hook,
    hookOnce: hooks.hookOnce,
    get key() {
      return resolveKey()
    },
    $inferDefinition: undefined as unknown as D,
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

export type RequestKernel<D extends Definition, Store> = ReturnType<
  typeof createRequestKernel<D, Store>
>

/**
 * Mutable context key (default `Symbol('permix')`) shared by HTTP adapters.
 */
export function withContextKey<T extends object>(
  build: (resolveKey: () => string | symbol) => T
): T & { contextKey: (newKey: string | symbol) => T } {
  let key: string | symbol = Symbol('permix')
  const permix = build(() => key)

  return Object.assign(permix, {
    contextKey(newKey: string | symbol) {
      key = newKey
      return permix
    },
  })
}
