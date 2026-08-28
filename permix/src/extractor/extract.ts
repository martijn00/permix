import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import type {
  JsonObject,
  JsonValue,
  PermissionMetadata,
} from '../core/permission'
import { importTinyglobby } from './deps'
import { PermissionExtractionError } from './error'
import { parsePermissionFile } from './parse'
import type { ExtractedPermission } from './parse'
import { PERMISSION_CATALOG_SCHEMA_VERSION } from './types'
import type {
  ExtractPermissionsOptions,
  PermissionCatalog,
  PermissionCatalogEntry,
  PermissionDiagnostic,
  PermissionReference,
} from './types'

const DEFAULT_INCLUDE = ['**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}']
const DEFAULT_EXCLUDE = [
  '**/.git/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/.permix/**',
  '**/coverage/**',
  '**/dist/**',
  '**/node_modules/**',
]

function normalizePath(filePath: string): string {
  return path.sep === '/' ? filePath : filePath.split(path.sep).join('/')
}

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`
  }

  return `{${Object.entries(value)
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(',')}}`
}

function metadataValue(
  metadata: PermissionMetadata,
  key: keyof PermissionMetadata
): JsonValue | undefined {
  return metadata[key]
}

function mergeMetadata(
  key: string,
  current: PermissionMetadata,
  incoming: PermissionMetadata,
  reference: PermissionReference,
  diagnostics: PermissionDiagnostic[]
): PermissionMetadata {
  const merged: {
    annotations?: JsonObject
    description?: string
    tags?: readonly string[]
    title?: string
  } = { ...current }

  for (const field of [
    'annotations',
    'description',
    'tags',
    'title',
  ] as const) {
    const currentValue = metadataValue(current, field)
    const incomingValue = metadataValue(incoming, field)

    if (incomingValue === undefined) {
      continue
    }

    if (
      currentValue !== undefined &&
      canonicalJson(currentValue) !== canonicalJson(incomingValue)
    ) {
      diagnostics.push({
        code: 'conflicting-metadata',
        file: reference.file,
        line: reference.line,
        column: reference.column,
        message: `Permission "${key}" has conflicting "${field}" metadata.`,
      })
      continue
    }

    if (field === 'annotations') {
      merged.annotations = incomingValue as JsonObject
    } else if (field === 'tags') {
      merged.tags = incomingValue as readonly string[]
    } else {
      merged[field] = incomingValue as string
    }
  }

  return merged
}

function compareReferences(
  left: PermissionReference,
  right: PermissionReference
): number {
  return (
    left.file.localeCompare(right.file) ||
    left.line - right.line ||
    left.column - right.column
  )
}

function buildCatalog(
  permissions: readonly ExtractedPermission[],
  options: ExtractPermissionsOptions
): PermissionCatalog {
  const entries = new Map<
    string,
    {
      metadata: PermissionMetadata
      references: PermissionReference[]
    }
  >()
  const diagnostics: PermissionDiagnostic[] = []

  for (const permission of permissions) {
    const existing = entries.get(permission.key)
    if (existing === undefined) {
      entries.set(permission.key, {
        metadata: permission.metadata,
        references: [permission.reference],
      })
      continue
    }

    existing.metadata = mergeMetadata(
      permission.key,
      existing.metadata,
      permission.metadata,
      permission.reference,
      diagnostics
    )
    existing.references.push(permission.reference)
  }

  if (options.metadata !== undefined) {
    for (const [key, metadata] of Object.entries(options.metadata)) {
      const entry = entries.get(key)
      if (entry === undefined) {
        diagnostics.push({
          code: 'stale-metadata',
          file: '<metadata>',
          message: `Metadata config references unknown permission "${key}".`,
        })
        continue
      }

      entry.metadata = {
        ...entry.metadata,
        ...metadata,
      }
    }
  }

  if (diagnostics.length > 0) {
    throw new PermissionExtractionError(diagnostics)
  }

  const catalogEntries: PermissionCatalogEntry[] = []
  for (const [key, entry] of entries) {
    catalogEntries.push({
      key,
      ...entry.metadata,
      references: entry.references.toSorted(compareReferences),
    })
  }

  return {
    schemaVersion: PERMISSION_CATALOG_SCHEMA_VERSION,
    permissions: catalogEntries.toSorted((left, right) =>
      left.key.localeCompare(right.key)
    ),
  }
}

export interface PermissionFileCacheEntry {
  readonly mtimeMs: number
  readonly size: number
  readonly diagnostics: readonly PermissionDiagnostic[]
  readonly permissions: readonly ExtractedPermission[]
}

export interface PermissionFileCache {
  hits: number
  misses: number
  clear: () => void
  delete: (absoluteFile: string) => void
  get: (absoluteFile: string) => PermissionFileCacheEntry | undefined
  keys: () => IterableIterator<string>
  set: (absoluteFile: string, entry: PermissionFileCacheEntry) => void
}

export function createPermissionFileCache(): PermissionFileCache {
  const files = new Map<string, PermissionFileCacheEntry>()

  return {
    hits: 0,
    misses: 0,
    clear() {
      files.clear()
      this.hits = 0
      this.misses = 0
    },
    delete(absoluteFile) {
      files.delete(absoluteFile)
    },
    get(absoluteFile) {
      return files.get(absoluteFile)
    },
    keys() {
      return files.keys()
    },
    set(absoluteFile, entry) {
      files.set(absoluteFile, entry)
    },
  }
}

async function parseCachedFile(
  cache: PermissionFileCache,
  cwd: string,
  absoluteFile: string,
  counters: { hits: number; misses: number }
): Promise<PermissionFileCacheEntry> {
  const stats = await stat(absoluteFile)
  const cached = cache.get(absoluteFile)
  if (
    cached !== undefined &&
    cached.mtimeMs === stats.mtimeMs &&
    cached.size === stats.size
  ) {
    counters.hits += 1
    return cached
  }

  counters.misses += 1
  const source = await readFile(absoluteFile, 'utf-8')
  const file = normalizePath(path.relative(cwd, absoluteFile))
  const parsed = await parsePermissionFile(file, source)
  const entry: PermissionFileCacheEntry = {
    mtimeMs: stats.mtimeMs,
    size: stats.size,
    diagnostics: parsed.diagnostics,
    permissions: parsed.permissions,
  }
  cache.set(absoluteFile, entry)
  return entry
}

export async function extractPermissions(
  options: ExtractPermissionsOptions = {}
): Promise<PermissionCatalog> {
  const cwd = path.resolve(options.cwd ?? process.cwd())
  const cache = options.cache ?? createPermissionFileCache()
  if (options.force === true) {
    cache.clear()
  }

  const { glob } = await importTinyglobby()
  const files = await glob(options.include ?? DEFAULT_INCLUDE, {
    absolute: true,
    cwd,
    dot: true,
    followSymbolicLinks: false,
    ignore: options.exclude ?? DEFAULT_EXCLUDE,
  })
  const fileSet = new Set(files)
  for (const cachedFile of cache.keys()) {
    if (!fileSet.has(cachedFile)) {
      cache.delete(cachedFile)
    }
  }

  const counters = { hits: 0, misses: 0 }
  const parsedFiles = await Promise.all(
    files
      .toSorted()
      .map((absoluteFile) =>
        parseCachedFile(cache, cwd, absoluteFile, counters)
      )
  )
  cache.hits = counters.hits
  cache.misses = counters.misses

  const diagnostics: PermissionDiagnostic[] = parsedFiles.flatMap(
    ({ diagnostics: fileDiagnostics }) => fileDiagnostics
  )
  const permissions: ExtractedPermission[] = parsedFiles.flatMap(
    ({ permissions: filePermissions }) => filePermissions
  )

  if (diagnostics.length > 0) {
    throw new PermissionExtractionError(diagnostics)
  }

  return buildCatalog(permissions, options)
}
