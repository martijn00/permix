import type { Permix as PermixCore } from '../core'
import { createPermix as createPermixCore } from '../core'
import type { Action } from '../core/definitions'
import type {
  InferStandardSchemaOutput,
  StandardSchemaV1,
} from '../core/standard-schema'
import {
  PermixInvalidActionsError,
  PermixInvalidSchemaMapError,
} from './errors'

/**
 * The default CRUD action set used when no `actions` are provided.
 */
export const DEFAULT_STANDARD_SCHEMA_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
] as const

export type DefaultStandardSchemaAction =
  (typeof DEFAULT_STANDARD_SCHEMA_ACTIONS)[number]

/**
 * An action name, or a named spec that marks entity data as required.
 * The entity type is taken from the schema passed to {@link entity} or the
 * map value — do not repeat `type` / `schema` here.
 */
export type EntityAction = string | { name: string; required?: boolean }

export interface EntityConfig<
  S extends StandardSchemaV1 = StandardSchemaV1,
  Actions extends readonly EntityAction[] = readonly EntityAction[],
> {
  readonly schema: S
  readonly actions: Actions
}

export type SchemaMapValue = StandardSchemaV1 | EntityConfig | readonly Action[]

export type SchemaMap = Record<string, SchemaMapValue>

type NamedAction<
  S extends StandardSchemaV1,
  A extends EntityAction,
> = A extends { name: infer N extends string; required: true }
  ? { name: N; type: InferStandardSchemaOutput<S>; required: true }
  : A extends string
    ? { name: A; type: InferStandardSchemaOutput<S> }
    : A extends { name: infer N extends string }
      ? { name: N; type: InferStandardSchemaOutput<S> }
      : never

type SpecsFromActionNames<
  S extends StandardSchemaV1,
  Actions extends readonly string[],
> = {
  [I in keyof Actions]: Actions[I] extends infer N extends string
    ? { name: N; type: InferStandardSchemaOutput<S> }
    : never
}

type SpecsFromEntityActions<
  S extends StandardSchemaV1,
  Actions extends readonly EntityAction[],
> = { [I in keyof Actions]: NamedAction<S, Actions[I] & EntityAction> }

/**
 * Permix {@link import('../core/definitions').Definition} derived from a
 * Standard Schema map. Bare schemas receive `Actions`; {@link entity} entries
 * keep their own action list; plain action tuples are passed through untyped.
 */
export type StandardSchemaDefinition<
  M extends SchemaMap,
  Actions extends readonly string[] = typeof DEFAULT_STANDARD_SCHEMA_ACTIONS,
> = {
  [K in keyof M]: M[K] extends EntityConfig<infer S, infer EA>
    ? SpecsFromEntityActions<S, EA>
    : M[K] extends StandardSchemaV1
      ? SpecsFromActionNames<M[K], Actions>
      : M[K] extends readonly Action[]
        ? M[K]
        : never
}

export interface CreateStandardSchemaPermixOptions<
  Actions extends readonly string[],
> {
  /**
   * Override the actions generated for every bare schema. Pass an `as const`
   * tuple to preserve literal types. Ignored for {@link entity} entries and
   * plain action tuples.
   *
   * @default ['create', 'read', 'update', 'delete']
   */
  actions?: Actions
}

/**
 * Extends the core Permix API with Standard Schema metadata.
 */
export interface StandardSchemaPermix<
  M extends SchemaMap,
  Actions extends readonly string[],
> extends PermixCore<StandardSchemaDefinition<M, Actions>> {
  /**
   * The default action names applied to every bare schema in the map.
   */
  readonly actions: Actions

  /**
   * The entity keys from the supplied schema map.
   */
  readonly entities: (keyof M & string)[]
}

function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const standard = (value as { '~standard'?: unknown })['~standard']
  if (typeof standard !== 'object' || standard === null) {
    return false
  }
  const props = standard as { version?: unknown; validate?: unknown }
  return props.version === 1 && typeof props.validate === 'function'
}

function isEntityConfig(value: unknown): value is EntityConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schema' in value &&
    'actions' in value &&
    isStandardSchema((value as EntityConfig).schema) &&
    Array.isArray((value as EntityConfig).actions)
  )
}

function isActionList(value: unknown): value is readonly Action[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => {
      if (typeof item === 'string') {
        return true
      }
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { name?: unknown }).name === 'string'
      )
    })
  )
}

function assertActions(actions: readonly string[]) {
  if (!Array.isArray(actions) || actions.length === 0) {
    throw new PermixInvalidActionsError()
  }
}

/**
 * Attach a Standard Schema to a custom action list for one entity.
 *
 * @example
 * ```ts
 * createPermix({
 *   post: entity(postSchema, ['create', 'read', { name: 'publish', required: true }]),
 *   dashboard: ['view'],
 * })
 * ```
 */
export function entity<
  S extends StandardSchemaV1,
  const Actions extends readonly EntityAction[],
>(schema: S, actions: Actions): EntityConfig<S, Actions> {
  assertActions(
    actions.map((item) => (typeof item === 'string' ? item : item.name))
  )
  return { schema, actions }
}

/**
 * Create a type-safe Permix instance whose permission tree mirrors a map of
 * Standard Schema validators (Zod, Valibot, ArkType, Effect Schema, …).
 *
 * Every bare schema becomes a top-level entity with the same set of actions
 * (CRUD by default). Use {@link entity} to customise actions per entity, or
 * pass an action-name tuple for an untyped entity.
 *
 * Schemas are used **only** to infer entity types. `check()` does not parse
 * or validate data at runtime.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { createPermix } from 'permix/standard-schema'
 *
 * const postSchema = z.object({
 *   id: z.string(),
 *   authorId: z.string(),
 * })
 *
 * const permix = createPermix({ post: postSchema })
 *
 * permix.setup({
 *   post: {
 *     create: true,
 *     read: true,
 *     update: (post) => post.authorId === me.id,
 *     delete: false,
 *   },
 * })
 *
 * permix.check('post.update', somePost)
 * ```
 */
export function createPermix<
  const M extends SchemaMap,
  const Actions extends readonly string[] =
    typeof DEFAULT_STANDARD_SCHEMA_ACTIONS,
>(
  map: M,
  options: CreateStandardSchemaPermixOptions<Actions> = {}
): StandardSchemaPermix<M, Actions> {
  const actions = (options.actions ??
    DEFAULT_STANDARD_SCHEMA_ACTIONS) as unknown as Actions

  assertActions(actions)

  const entities = Object.keys(map) as (keyof M & string)[]

  for (const key of entities) {
    const value = map[key]
    if (isStandardSchema(value)) {
      continue
    }
    if (isEntityConfig(value)) {
      assertActions(
        value.actions.map((item) =>
          typeof item === 'string' ? item : item.name
        )
      )
      continue
    }
    if (isActionList(value)) {
      continue
    }
    throw new PermixInvalidSchemaMapError(key)
  }

  type D = StandardSchemaDefinition<M, Actions>

  const permix = createPermixCore<D>()

  return Object.assign(permix, { actions, entities })
}

/** Return type of {@link createPermix}. */
export type StandardSchemaPermixInstance<
  M extends SchemaMap,
  Actions extends readonly string[] = typeof DEFAULT_STANDARD_SCHEMA_ACTIONS,
> = ReturnType<typeof createPermix<M, Actions>>
