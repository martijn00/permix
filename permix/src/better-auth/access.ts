import type { Role, Statements } from 'better-auth/plugins/access'

import type { Rules } from '../core'

export type DefinitionFromAccessControl<S extends Statements> = {
  readonly [Resource in keyof S & string]: S[Resource]
}

/**
 * Preserves a Better Auth access-control statement as an optional inferred
 * Permix Definition. Applications may continue to use a manual Definition.
 */
export function inferDefinitionFromAccessControl<const S extends Statements>(
  statements: S
): DefinitionFromAccessControl<S> {
  return statements
}

/**
 * Expands a Better Auth role into a complete boolean Permix rules tree.
 * Actions absent from the role are explicitly denied.
 */
export function rulesFromBetterAuthRole<
  const S extends Statements,
  const R extends Statements,
>(statements: S, role: Role<R, S>): Rules<DefinitionFromAccessControl<S>> {
  const rules: Record<string, Record<string, boolean>> = {}

  for (const resource of Object.keys(statements)) {
    const granted = new Set(role.statements[resource])
    const resourceRules: Record<string, boolean> = {}
    for (const action of statements[resource] ?? []) {
      resourceRules[action] = granted.has(action)
    }
    rules[resource] = resourceRules
  }

  return rules as Rules<DefinitionFromAccessControl<S>>
}
