import type { Definition, RulesPaths } from '../core'
import type { PermissionCatalog } from '../extractor/types'
import type { PermissionCoverageResult } from '../extractor/validate'
import { validatePermissionCoverage } from '../extractor/validate'

export type SupabaseTableOperation = 'delete' | 'insert' | 'select' | 'update'

export type SupabaseViewOperation = 'select'

export interface SupabaseTablePolicyOperation<
  Schema extends string = string,
  Relation extends string = string,
  Operation extends SupabaseTableOperation = SupabaseTableOperation,
> {
  readonly schema: Schema
  readonly relation: Relation
  readonly relationType: 'table'
  readonly operation: Operation
}

export interface SupabaseViewPolicyOperation<
  Schema extends string = string,
  Relation extends string = string,
> {
  readonly schema: Schema
  readonly relation: Relation
  readonly relationType: 'view'
  readonly operation: 'select'
}

export type SupabasePolicyOperation =
  | SupabaseTablePolicyOperation
  | SupabaseViewPolicyOperation

type OperationForPath<Path extends string> =
  Path extends `${infer Schema}.tables.${infer Relation}.${infer Operation}`
    ? Operation extends SupabaseTableOperation
      ? SupabaseTablePolicyOperation<Schema, Relation, Operation>
      : never
    : Path extends `${infer Schema}.views.${infer Relation}.select`
      ? SupabaseViewPolicyOperation<Schema, Relation>
      : never

type PolicyOperationForPath<Path extends string> = [
  OperationForPath<Path>,
] extends [never]
  ? SupabasePolicyOperation
  : OperationForPath<Path>

/**
 * Canonical path-to-operation map checked against a Permix Definition.
 * Definitions inferred by this package additionally check that the descriptor
 * matches the schema, relation, and operation encoded in the inferred path.
 * Manual definitions can use any canonical vocabulary.
 */
export type SupabasePolicyManifestInput<D extends Definition> = {
  readonly [Path in RulesPaths<D>]?: PolicyOperationForPath<Path>
}

export interface SupabasePolicyManifest<D extends Definition> {
  readonly entries: SupabasePolicyManifestInput<D>
  readonly keys: readonly RulesPaths<D>[]
  readonly coverage: PermissionCoverageResult | null
}

export interface CreateSupabasePolicyManifestOptions {
  /**
   * Optional extracted catalog. It is supplied explicitly and is never loaded
   * from generated files.
   */
  readonly catalog?: PermissionCatalog
}

/**
 * Creates a runtime manifest and, when a catalog is provided, reports unknown
 * provider keys and uncovered catalog permissions.
 */
export function createSupabasePolicyManifest<D extends Definition>(
  entries: SupabasePolicyManifestInput<D>,
  options: CreateSupabasePolicyManifestOptions = {}
): SupabasePolicyManifest<D> {
  const keys = Object.keys(entries) as RulesPaths<D>[]

  return {
    entries,
    keys,
    coverage:
      options.catalog === undefined
        ? null
        : validatePermissionCoverage(options.catalog, keys),
  }
}
