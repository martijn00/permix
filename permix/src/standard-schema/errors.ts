import { PermixError } from '../core/errors'
import type { StandardSchemaV1Issue } from '../core/standard-schema'

export class PermixInvalidActionsError extends PermixError {
  constructor() {
    super('`actions` must be a non-empty array of strings.')
    this.name = 'PermixInvalidActionsError'
  }
}

export class PermixInvalidSchemaMapError extends PermixError {
  key: string

  constructor(key: string) {
    super(
      `Invalid standard-schema map value at "${key}". Expected a Standard Schema, entity(schema, actions), or an action name tuple.`
    )
    this.name = 'PermixInvalidSchemaMapError'
    this.key = key
  }
}

/**
 * Thrown when {@link import('./permix').CreateStandardSchemaPermixOptions.validate}
 * is `'throw'` and `check()` data fails the entity schema.
 */
export class PermixValidationError extends PermixError {
  path: string
  issues: readonly StandardSchemaV1Issue[]

  constructor(path: string, issues: readonly StandardSchemaV1Issue[]) {
    super(`Data for "${path}" failed schema validation.`)
    this.name = 'PermixValidationError'
    this.path = path
    this.issues = issues
  }
}

/**
 * Thrown when a schema's Standard Schema `validate` returns a Promise.
 * `permix.check()` is synchronous.
 */
export class PermixAsyncValidationError extends PermixError {
  path: string

  constructor(path: string) {
    super(
      `Schema validation for "${path}" is asynchronous. permix.check() is synchronous; use a sync schema.`
    )
    this.name = 'PermixAsyncValidationError'
    this.path = path
  }
}
