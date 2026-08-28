import type {
  InferStandardSchemaOutput,
  StandardSchemaV1,
} from './standard-schema'

export interface ActionSpec {
  name: string
  type?: unknown
  /**
   * A Standard Schema (Zod, Valibot, ArkType, Effect Schema, …). Entity data
   * for this action is inferred as {@link InferStandardSchemaOutput}.
   * Ignored when {@link type} is also set — `type` wins.
   */
  schema?: StandardSchemaV1
  required?: boolean
}

export type Action = string | ActionSpec

/**
 * Entity data type for an action: {@link ActionSpec.type} if present, else
 * {@link InferStandardSchemaOutput} of {@link ActionSpec.schema}. `never`
 * when the action is a plain string (no entity data).
 */
export type ActionData<A extends Action> = A extends string
  ? never
  : A extends { type: infer T }
    ? T
    : A extends { schema: infer S extends StandardSchemaV1 }
      ? InferStandardSchemaOutput<S>
      : never

/**
 * The full type of a permissions tree passed to `createPermix<D>()`.
 *
 * @example Flat
 * ```ts
 * type D = ['read', 'write']
 * ```
 *
 * @example One level
 * ```ts
 * type D = {
 *   post: ['create', 'read']
 *   user: ['invite']
 * }
 * ```
 *
 * @example Deeply nested
 * ```ts
 * type D = {
 *   workspace: {
 *     member: ['invite', 'remove']
 *     billing: ['view', 'update']
 *   }
 * }
 * ```
 */
export type Definition = readonly Action[] | { [key: string]: Definition }

export type ValidateDefinition<D extends Definition> = D &
  ([Extract<Definition, string>] extends [never]
    ? unknown
    : Extract<Definition, string>)

/** Resolves an {@link Action} to its string name. */
export type ActionName<A extends Action> = A extends string
  ? A
  : A extends { name: infer N extends string }
    ? N
    : never
