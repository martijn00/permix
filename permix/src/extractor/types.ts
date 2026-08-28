import type { PermissionMetadata } from '../core/permission'
import type { PermissionFileCache } from './extract'

export const PERMISSION_CATALOG_SCHEMA_VERSION = 1 as const

export interface PermissionReference {
  readonly file: string
  readonly line: number
  readonly column: number
}

export interface PermissionCatalogEntry extends PermissionMetadata {
  readonly key: string
  readonly references: readonly PermissionReference[]
}

export interface PermissionCatalog {
  readonly schemaVersion: typeof PERMISSION_CATALOG_SCHEMA_VERSION
  readonly permissions: readonly PermissionCatalogEntry[]
}

export type PermissionMetadataConfig = Readonly<
  Record<string, PermissionMetadata>
>

export type PermissionDiagnosticCode =
  | 'conflicting-metadata'
  | 'dynamic-value'
  | 'invalid-marker'
  | 'invalid-permission-key'
  | 'marker-shadowed'
  | 'parse-error'
  | 'stale-metadata'

export interface PermissionDiagnostic {
  readonly code: PermissionDiagnosticCode
  readonly message: string
  readonly file: string
  readonly line?: number
  readonly column?: number
}

export interface ExtractPermissionsOptions {
  readonly cwd?: string
  readonly include?: readonly string[]
  readonly exclude?: readonly string[]
  readonly metadata?: PermissionMetadataConfig
  readonly cache?: PermissionFileCache
  readonly force?: boolean
}

export interface GeneratePermissionsOptions extends ExtractPermissionsOptions {
  readonly catalogOutput?: string
  readonly moduleOutput?: string
}
