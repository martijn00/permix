import type { PermissionCatalog } from './types'

export interface PermissionCoverageResult {
  readonly valid: boolean
  readonly unknown: readonly string[]
  readonly uncovered: readonly string[]
}

export type PermissionKeySource = PermissionCatalog | Iterable<string>

function permissionKeys(source: PermissionKeySource): Set<string> {
  if (
    typeof source === 'object' &&
    source !== null &&
    'permissions' in source
  ) {
    return new Set(source.permissions.map(({ key }) => key))
  }

  return new Set(source)
}

/**
 * Compares provider policy or operation keys with an extracted catalog.
 */
export function validatePermissionCoverage(
  catalog: PermissionKeySource,
  providerManifest: PermissionKeySource
): PermissionCoverageResult {
  const catalogKeys = permissionKeys(catalog)
  const providerKeys = permissionKeys(providerManifest)
  const unknown = [...providerKeys]
    .filter((key) => !catalogKeys.has(key))
    .toSorted()
  const uncovered = [...catalogKeys]
    .filter((key) => !providerKeys.has(key))
    .toSorted()

  return {
    valid: unknown.length === 0 && uncovered.length === 0,
    unknown,
    uncovered,
  }
}
