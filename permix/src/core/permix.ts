import type { CheckArgs, CheckContext, ExplainResult } from './check'
import { createCheckContext, createExplain } from './check'
import type { Action, ActionData, ActionName, Definition } from './definitions'
import { PermixNotReadyError } from './errors'
import { createHooks } from './hooks'
import type { DehydratedState, Rules } from './rules'
import { createRules, dehydrateRules, hydrateRules } from './rules'
import { createTemplate } from './template'

export type { DehydratedState, Rules } from './rules'

type ActionArgs<A extends Action> = [ActionData<A>] extends [never]
  ? []
  : A extends { required: true }
    ? [ActionData<A>]
    : [ActionData<A>?]

type ActionByName<A extends Action, N extends string> = A extends unknown
  ? ActionName<A> extends N
    ? A
    : never
  : never

// Caps recursion depth to avoid "Type instantiation is excessively deep" errors.
type Depth = [
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
]

export type RulesPaths<
  D,
  Prefix extends string = '',
  N extends unknown[] = Depth,
> = N extends [unknown, ...infer Rest]
  ? D extends readonly Action[]
    ? `${Prefix}${ActionName<D[number]>}`
    : {
        [K in keyof D & string]: D[K] extends Definition
          ? RulesPaths<D[K], `${Prefix}${K}.`, Rest>
          : never
      }[keyof D & string]
  : never

export type SpecialSymbol = '~any' | '~all'

export type SpecialPath<
  D,
  Prefix extends string = '',
  N extends unknown[] = Depth,
> = N extends [unknown, ...infer Rest]
  ?
      | `${Prefix}${SpecialSymbol}`
      | (D extends readonly Action[]
          ? never
          : {
              [K in keyof D & string]: D[K] extends Definition
                ? SpecialPath<D[K], `${Prefix}${K}.`, Rest>
                : never
            }[keyof D & string])
  : never

export type DataAtPath<
  D,
  P extends string,
  N extends unknown[] = Depth,
> = N extends [unknown, ...infer Rest]
  ? D extends readonly Action[]
    ? ActionArgs<ActionByName<D[number], P>>
    : P extends `${infer K}.${infer Tail}`
      ? K extends keyof D
        ? DataAtPath<D[K], Tail, Rest>
        : never
      : never
  : never

export type CheckerFn<D extends Definition> = <P extends RulesPaths<D>>(
  path: P,
  ...data: DataAtPath<D, P>
) => boolean

export interface PermixHooks<D extends Definition = Definition> {
  setup: (instance: Permix<D>) => void
  ready: (instance: Permix<D>) => void
  check: (context: CheckContext<D>) => void
}

export interface Permix<D extends Definition> {
  /**
   * Build a frozen instance with these rules. Does not mutate `this`.
   *
   * Overlapping `setup()` calls on one factory return isolated instances —
   * later calls cannot change an earlier instance's `check()`.
   *
   * @example
   * ```ts
   * const permix = createPermix<{ post: ['create'] }>().setup({
   *   post: { create: true },
   * })
   * permix.check('post.create')
   * ```
   */
  setup: (rules: Rules<D>) => Permix<D>

  /**
   * Evaluate the current rules. Accepts one of three calling forms:
   *
   * - **Dot-path** — check a single action at a leaf path. Pass extra
   *   arguments after the path when the matched action declares `type`
   *   (required when `required: true`, optional otherwise).
   * - **Special token** — `'~any'` returns `true` if **any** rule in the tree
   *   (including dynamic ones called with no data) is truthy; `'~all'` returns
   *   `true` only if **every** rule is truthy. Prefix with a dot-path to scope
   *   the aggregation to a subtree, e.g. `'post.~all'` or
   *   `'workspace.customer.~any'`.
   * - **Callback** — compose multiple checks. `c` eagerly evaluates a rule and
   *   returns a plain boolean, so combine with `&&`, `||`, `!`, ternaries, or
   *   any custom logic.
   *
   * @example
   * ```ts
   * permix.check('post.create')
   * permix.check('post.edit', { authorId })
   * permix.check('~any')
   * permix.check('~all')
   * permix.check('post.~all')
   * permix.check('workspace.customer.~any')
   * permix.check(c => c('post.read') && c('post.edit'))
   * permix.check(c => !c('post.read'))
   * ```
   */
  check: (...args: CheckArgs<D>) => boolean

  /**
   * Same arguments as {@link Permix.check}, but returns `{ allowed, path, reasons }`
   * so UIs can show why a path was denied. Boolean rules produce no reasons.
   * Rule functions may `return { allow, reason }` instead of a bare boolean.
   */
  explain: (...args: CheckArgs<D>) => ExplainResult

  /**
   * Serialize the current rules into a JSON-safe object.
   *
   * Function-based rules are invoked once (with no check data) and their
   * boolean result is stored. Re-run `setup()` on the client if you need
   * dynamic rules that depend on check-time data.
   *
   * @example
   * ```ts
   * const state = permix.dehydrate()
   * // { post: { create: true, edit: false } }
   * ```
   */
  dehydrate: () => DehydratedState<D>

  /**
   * Restore rules from a value produced by `dehydrate()`.
   *
   * Returns a **new** frozen instance. Hydration restores only the serialized
   * booleans and **does not** mark that instance as ready: `isReady()` stays
   * `false` until you `setup()` (which returns a ready instance). Gating on
   * readiness surfaces a forgotten `setup()` instead of silently serving
   * collapsed permissions.
   *
   * @example
   * ```ts
   * const client = permix.hydrate(serverState) // isReady() === false
   * const ready = client.setup(clientRules)    // isReady() === true
   * ```
   */
  hydrate: (state: DehydratedState<D>) => Permix<D>

  /**
   * Define reusable permission rules separate from `setup()`.
   *
   * Static templates return a zero-arg function; dynamic templates accept
   * runtime parameters and return rules for `setup()`.
   *
   * @example
   * ```ts
   * const adminPermissions = permix.template({
   *   post: { create: true, read: true },
   * })
   * permix.setup(adminPermissions())
   * ```
   */
  template: <T = void>(
    rules: Rules<D> | ((param: T) => Rules<D>)
  ) => (() => Rules<D>) | ((param: T) => Rules<D>)

  /**
   * Register a hook that fires every time the named event occurs.
   * Returns a function that removes the listener.
   *
   * @example
   * ```ts
   * const remove = permix.hook('setup', () => {
   *   console.log('Permissions were updated')
   * })
   * ```
   */
  hook: <K extends keyof PermixHooks<D>>(
    name: K,
    fn: PermixHooks<D>[K]
  ) => () => void

  /**
   * Register a hook that fires only once for the named event.
   *
   * @example
   * ```ts
   * permix.hookOnce('setup', () => {
   *   console.log('Permissions were updated once')
   * })
   * ```
   */
  hookOnce: <K extends keyof PermixHooks<D>>(
    name: K,
    fn: PermixHooks<D>[K]
  ) => void

  /**
   * Returns `true` if `setup()` has been called at least once (or initial
   * rules were passed to `createPermix`). `hydrate()` alone does **not** make
   * the instance ready.
   */
  isReady: () => boolean

  /**
   * Returns a promise that resolves once the instance is ready — i.e. once
   * `setup()` has been called, or initial rules were provided. `hydrate()`
   * does **not** resolve it. Resolves immediately if already ready.
   *
   * @example
   * ```ts
   * await permix.isReadyAsync()
   * permix.check('post.create')
   * ```
   */
  isReadyAsync: () => Promise<void>

  /**
   * Returns the current rules object.
   */
  getRules: () => Rules<D> | null

  /**
   * Type-only carrier for the Permix definition schema. Use with `typeof` to
   * derive the definition without restating it. Always `undefined` at runtime.
   *
   * @example
   * ```ts
   * type Def = typeof permix.$inferDefinition
   * const other = createPermix<typeof permix.$inferDefinition>()
   * ```
   */
  readonly $inferDefinition: D

  /**
   * Type-only carrier for the union of all valid permission paths
   * (e.g. `'user.create' | 'post.read'`). Use with `typeof` to derive
   * path types without repeating the definition. Always `undefined` at runtime.
   *
   * @example
   * ```ts
   * const path: typeof permix.$inferPath = 'user.create'
   *
   * const ALL = ['user.create', 'job.remove'] satisfies (typeof permix.$inferPath)[]
   * ```
   */
  readonly $inferPath: RulesPaths<D>
}

/**
 * Factory returned by `createPermix()`. `setup()` / `hydrate()` return
 * {@link Permix} instances; they never mutate the factory.
 */
export type PermixFactory<D extends Definition> = Permix<D>

export type PermixInstance<D extends Definition> = Permix<D>

const checkEmitters = new WeakMap<
  object,
  (args: CheckArgs<any>, allowed: boolean, error?: unknown) => void
>()

const permixFamilies = new WeakMap<object, object>()

export function isSamePermixFamily(a: object, b: object): boolean {
  return permixFamilies.get(a) === permixFamilies.get(b)
}

/**
 * Fire the `check` hook on an instance without evaluating rules.
 * Used when Standard Schema `validate: 'deny'` rejects the payload.
 */
export function notifyCheck(
  instance: object,
  args: readonly unknown[],
  allowed: boolean,
  error?: unknown
): void {
  checkEmitters.get(instance)?.(args as CheckArgs<any>, allowed, error)
}

interface PermixFamily<D extends Definition> {
  lifecycle: ReturnType<
    typeof createHooks<Pick<PermixHooks<D>, 'setup' | 'ready'>>
  >
}

function createFrozenPermix<D extends Definition>(
  family: PermixFamily<D>,
  rules: Rules<D> | null,
  ready: boolean
): Permix<D> {
  const checkHooks = createHooks<Pick<PermixHooks<D>, 'check'>>()
  const readyPromise = ready
    ? Promise.resolve()
    : new Promise<void>(() => undefined)

  const explainFn = createExplain<D>(() => rules)

  function emitCheck(
    args: CheckArgs<D>,
    allowed: boolean,
    error?: unknown,
    reasons: readonly string[] = []
  ): void {
    const context = createCheckContext<D>(...args)
    checkHooks.callHook(
      'check',
      error === undefined
        ? { ...context, allowed, reasons }
        : { ...context, allowed, error, reasons }
    )
  }

  const permix: Permix<D> = {
    setup(r) {
      const next = createFrozenPermix(family, createRules<D>(r), true)
      family.lifecycle.callHook('setup', next)
      family.lifecycle.callHook('ready', next)
      return next
    },
    check(...args: CheckArgs<D>): boolean {
      try {
        const result = explainFn(...args)
        emitCheck(args, result.allowed, undefined, result.reasons)
        return result.allowed
      } catch (error) {
        emitCheck(args, false, error)
        throw error
      }
    },
    explain(...args: CheckArgs<D>): ExplainResult {
      return explainFn(...args)
    },
    dehydrate() {
      if (!rules) {
        throw new PermixNotReadyError()
      }
      return dehydrateRules(rules) as DehydratedState<D>
    },
    hydrate(state) {
      const next = createFrozenPermix(family, hydrateRules(state), false)
      family.lifecycle.callHook('setup', next)
      return next
    },
    template(templateRules) {
      return createTemplate(templateRules)
    },
    hook: (name, fn) => {
      if (name === 'check') {
        return checkHooks.hook('check', fn as PermixHooks<D>['check'])
      }
      return family.lifecycle.hook(name, fn as never)
    },
    hookOnce: (name, fn) => {
      if (name === 'check') {
        checkHooks.hookOnce('check', fn as PermixHooks<D>['check'])
        return
      }
      family.lifecycle.hookOnce(name, fn as never)
    },
    isReady: () => ready,
    isReadyAsync: () => readyPromise,
    getRules: () => rules,
    $inferDefinition: undefined as unknown as D,
    $inferPath: undefined as unknown as RulesPaths<D>,
  }

  checkEmitters.set(permix, (args, allowed, error) => {
    emitCheck(args as CheckArgs<D>, allowed, error)
  })
  permixFamilies.set(permix, family)

  return Object.freeze(permix)
}

/**
 * Create a type-safe Permix factory. `setup(rules)` and `hydrate(state)`
 * return frozen instances and never mutate the factory.
 *
 * Passing initial rules is the same as `createPermix<D>().setup(rules)`.
 *
 * @example Flat definition
 * ```ts
 * const permix = createPermix<['read', 'write']>().setup({
 *   read: true,
 *   write: false,
 * })
 * permix.check('read') // true
 * ```
 */
export function createPermix<D extends Definition>(
  initialRules?: Rules<D>
): Permix<D> {
  const family: PermixFamily<D> = {
    lifecycle: createHooks<Pick<PermixHooks<D>, 'setup' | 'ready'>>(),
  }
  const factory = createFrozenPermix<D>(family, null, false)
  if (initialRules) {
    return factory.setup(initialRules)
  }
  return factory
}
