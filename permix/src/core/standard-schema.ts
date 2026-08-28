/**
 * Standard Schema V1 types, vendored from
 * {@link https://standardschema.dev | standardschema.dev} so Permix can infer
 * entity data from Zod, Valibot, ArkType, Effect Schema, and other
 * Standard Schema implementations without taking a runtime dependency.
 *
 * Flattened from the spec's `StandardSchemaV1` namespace to match this repo's
 * lint rules. The `~standard` protocol is type-only here. Permix does not
 * parse `check()` data at runtime.
 */

export interface StandardSchemaV1Types<Input = unknown, Output = Input> {
  readonly input: Input
  readonly output: Output
}

export interface StandardSchemaV1PathSegment {
  readonly key: PropertyKey
}

export interface StandardSchemaV1Issue {
  readonly message: string
  readonly path?:
    | readonly (PropertyKey | StandardSchemaV1PathSegment)[]
    | undefined
}

export interface StandardSchemaV1SuccessResult<Output> {
  readonly value: Output
  readonly issues?: undefined
}

export interface StandardSchemaV1FailureResult {
  readonly issues: readonly StandardSchemaV1Issue[]
}

export type StandardSchemaV1Result<Output> =
  | StandardSchemaV1SuccessResult<Output>
  | StandardSchemaV1FailureResult

export interface StandardSchemaV1Props<Input = unknown, Output = Input> {
  readonly version: 1
  readonly vendor: string
  readonly validate: (
    value: unknown
  ) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>
  readonly types?: StandardSchemaV1Types<Input, Output> | undefined
}

/** The Standard Schema interface. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1Props<Input, Output>
}

/** Infers the input type of a Standard Schema. */
export type InferStandardSchemaInput<Schema extends StandardSchemaV1> =
  NonNullable<Schema['~standard']['types']>['input']

/** Infers the output type of a Standard Schema. */
export type InferStandardSchemaOutput<Schema extends StandardSchemaV1> =
  NonNullable<Schema['~standard']['types']>['output']

export interface ActionSchemaOptions<R extends boolean = false> {
  required?: R
}

/**
 * Build an {@link import('./definitions').ActionSpec} whose entity data type
 * is inferred from a Standard Schema (Zod, Valibot, ArkType, …).
 *
 * Use with `createPermix<typeof definition>()` and `as const` so action names
 * stay literal.
 *
 * @example
 * ```ts
 * const postSchema = z.object({ id: z.string(), authorId: z.string() })
 *
 * const definition = {
 *   post: [
 *     'create',
 *     action('edit', postSchema, { required: true }),
 *   ],
 * } as const
 *
 * const permix = createPermix<typeof definition>()
 * ```
 */
export function action<
  const N extends string,
  S extends StandardSchemaV1,
  const R extends boolean = false,
>(
  name: N,
  schema: S,
  options?: ActionSchemaOptions<R>
): R extends true
  ? { readonly name: N; readonly schema: S; readonly required: true }
  : { readonly name: N; readonly schema: S } {
  if (options?.required === true) {
    return { name, schema, required: true as const } as never
  }
  return { name, schema } as never
}
