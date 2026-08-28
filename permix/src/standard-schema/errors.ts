import { PermixError } from '../core/errors'

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
