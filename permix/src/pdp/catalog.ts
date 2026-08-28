import type {
  PermissionCatalog,
  PermissionCatalogEntry,
} from '../extractor/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateEntry(
  value: unknown,
  index: number
): asserts value is PermissionCatalogEntry {
  if (!isRecord(value)) {
    throw new TypeError(
      `Catalog permission at index ${index} must be an object.`
    )
  }
  if (typeof value.key !== 'string' || value.key.length === 0) {
    throw new TypeError(
      `Catalog permission at index ${index} requires a non-empty key.`
    )
  }
  if (!Array.isArray(value.references)) {
    throw new TypeError(
      `Catalog permission "${value.key}" requires a references array.`
    )
  }
  if (value.title !== undefined && typeof value.title !== 'string') {
    throw new TypeError(
      `Catalog permission "${value.key}" has an invalid title.`
    )
  }
  if (
    value.description !== undefined &&
    typeof value.description !== 'string'
  ) {
    throw new TypeError(
      `Catalog permission "${value.key}" has an invalid description.`
    )
  }
}

/**
 * Validates caller-provided catalog data without reading from the filesystem.
 * Unknown fields are intentionally accepted for forward-compatible v1 data.
 */
export function validatePdpCatalog(
  value: unknown
): asserts value is PermissionCatalog {
  if (!isRecord(value)) {
    throw new TypeError('Permission catalog must be an object.')
  }
  if (value.schemaVersion !== 1) {
    throw new TypeError(
      `Unsupported permission catalog schemaVersion: ${String(value.schemaVersion)}.`
    )
  }
  if (!Array.isArray(value.permissions)) {
    throw new TypeError('Permission catalog requires a permissions array.')
  }
  for (const [index, permission] of value.permissions.entries()) {
    validateEntry(permission, index)
  }
}

export function optionalPdpCatalog(
  value: PermissionCatalog | undefined
): PermissionCatalog | undefined {
  if (value !== undefined) {
    validatePdpCatalog(value)
  }
  return value
}
