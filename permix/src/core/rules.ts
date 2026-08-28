import { callRuleWithoutData } from './check'
import type { Action, ActionData, ActionName, Definition } from './definitions'

type ActionRule<A extends Action> = [ActionData<A>] extends [never]
  ? boolean | (() => boolean)
  : A extends { required: true }
    ? (data: ActionData<A>) => boolean
    : ((data?: ActionData<A>) => boolean) | boolean

/**
 * The shape of the object passed to `permix.setup()` (and produced by
 * {@link createRules}). It mirrors the `Definition` `D`: every leaf action
 * becomes either a `boolean` or a `(data) => boolean` validator.
 */
export type Rules<D extends Definition> = D extends readonly Action[]
  ? { [E in D[number] as ActionName<E>]: ActionRule<E> }
  : { [K in keyof D]: D[K] extends Definition ? Rules<D[K]> : never }

/**
 * The JSON-safe form of {@link Rules}, where every leaf rule has been
 * collapsed to a plain `boolean`. Produced by `permix.dehydrate()` and
 * consumed by `permix.hydrate()`.
 */
export type DehydratedState<D extends Definition> = D extends readonly Action[]
  ? { [E in D[number] as ActionName<E>]: boolean }
  : {
      [K in keyof D & string]: D[K] extends Definition
        ? DehydratedState<D[K]>
        : never
    }

/**
 * Property names that must never become rule keys. Assigning `__proto__` on a
 * plain object can install a prototype; `constructor` / `prototype` are the
 * same class of inherited lookup. The extractor rejects these segments too.
 */
export const RESERVED_RULE_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
])

function cloneRuleNode(node: unknown, freeze: boolean): unknown {
  if (typeof node === 'boolean' || typeof node === 'function') {
    return node
  }
  if (node && typeof node === 'object') {
    const source = node as Record<string, unknown>
    const result: Record<string, unknown> = Object.create(null)
    for (const key of Object.keys(source)) {
      if (RESERVED_RULE_KEYS.has(key)) {
        continue
      }
      result[key] = cloneRuleNode(source[key], freeze)
    }
    return freeze ? Object.freeze(result) : result
  }
  return node
}

function dehydrateNode(node: unknown): unknown {
  if (typeof node === 'boolean') {
    return node
  }
  if (typeof node === 'function') {
    return callRuleWithoutData(node as () => unknown)
  }
  if (node && typeof node === 'object') {
    const source = node as Record<string, unknown>
    const result: Record<string, unknown> = Object.create(null)
    for (const key of Object.keys(source)) {
      if (RESERVED_RULE_KEYS.has(key)) {
        continue
      }
      result[key] = dehydrateNode(source[key])
    }
    return result
  }
  return node
}

function toJsonObject(node: unknown): unknown {
  if (!node || typeof node !== 'object') {
    return node
  }
  const source = node as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(source)) {
    result[key] = toJsonObject(source[key])
  }
  return result
}

/**
 * Recursively collapse a rules tree into its JSON-safe {@link DehydratedState}.
 *
 * Function-based rules are invoked once with no data; entity-required
 * validators that throw on `undefined` are treated as `false`.
 */
export function dehydrateRules(node: unknown): unknown {
  return toJsonObject(dehydrateNode(node))
}

/**
 * Rebuild a {@link Rules} tree from a {@link DehydratedState} produced by
 * {@link dehydrateRules}. Only the serialized booleans are restored.
 */
export function hydrateRules<D extends Definition>(
  state: DehydratedState<D>
): Rules<D> {
  return cloneRuleNode(state, true) as Rules<D>
}

/**
 * Build a typed {@link Rules} object for a given {@link Definition}.
 *
 * Copies the tree onto a null-prototype object and deep-freezes it so later
 * mutation of the input (or of `getRules()`) cannot change authorization.
 *
 * @example
 * ```ts
 * const rules = createRules<{ post: ['create', 'read'] }>({
 *   post: { create: true, read: false },
 * })
 *
 * permix.setup(rules)
 * ```
 */
export function createRules<D extends Definition>(rules: Rules<D>): Rules<D> {
  return cloneRuleNode(rules, true) as Rules<D>
}
