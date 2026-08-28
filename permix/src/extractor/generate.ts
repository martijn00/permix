import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { JsonValue } from '../core/permission'
import { PermissionExtractionError } from './error'
import { extractPermissions } from './extract'
import type {
  GeneratePermissionsOptions,
  PermissionCatalog,
  PermissionCatalogEntry,
  PermissionDiagnostic,
} from './types'

type GeneratedDefinition =
  | readonly string[]
  | { readonly [key: string]: GeneratedDefinition }

interface PermissionTree {
  readonly actions: Set<string>
  readonly children: Map<string, PermissionTree>
}

const RESERVED_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype'])

function createTree(): PermissionTree {
  return {
    actions: new Set(),
    children: new Map(),
  }
}

function propertyCollision(key: string, message: string): PermissionDiagnostic {
  return {
    code: 'invalid-permission-key',
    file: '<catalog>',
    message: `Permission "${key}" ${message}`,
  }
}

function buildTree(catalog: PermissionCatalog): PermissionTree {
  const root = createTree()
  const diagnostics: PermissionDiagnostic[] = []

  for (const permission of catalog.permissions) {
    const segments = permission.key.split('.')
    const reservedSegment = segments.find((segment) =>
      RESERVED_SEGMENTS.has(segment)
    )
    if (reservedSegment !== undefined) {
      diagnostics.push(
        propertyCollision(
          permission.key,
          `uses reserved generated property "${reservedSegment}".`
        )
      )
      continue
    }

    let node = root
    let valid = true
    for (const segment of segments.slice(0, -1)) {
      if (node.actions.size > 0) {
        diagnostics.push(
          propertyCollision(
            permission.key,
            'collides with a permission action at the same tree level.'
          )
        )
        valid = false
        break
      }

      const child = node.children.get(segment) ?? createTree()
      node.children.set(segment, child)
      node = child
    }

    if (!valid) {
      continue
    }

    const action = segments.at(-1)
    if (action === undefined) {
      continue
    }
    if (node.children.size > 0) {
      diagnostics.push(
        propertyCollision(
          permission.key,
          'collides with a nested permission group at the same tree level.'
        )
      )
      continue
    }
    node.actions.add(action)
  }

  if (diagnostics.length > 0) {
    throw new PermissionExtractionError(diagnostics)
  }

  return root
}

function definitionFromTree(tree: PermissionTree): GeneratedDefinition {
  if (tree.actions.size > 0) {
    return [...tree.actions].toSorted()
  }

  const definition: Record<string, GeneratedDefinition> = Object.create(null)
  for (const [key, child] of [...tree.children].toSorted(([left], [right]) =>
    left.localeCompare(right)
  )) {
    definition[key] = definitionFromTree(child)
  }
  return definition
}

function constantsFromTree(
  tree: PermissionTree,
  prefix = ''
): Readonly<Record<string, JsonValue>> {
  const constants: Record<string, JsonValue> = Object.create(null)

  if (tree.actions.size > 0) {
    for (const action of [...tree.actions].toSorted()) {
      constants[action] = `${prefix}${action}`
    }
    return constants
  }

  for (const [key, child] of [...tree.children].toSorted(([left], [right]) =>
    left.localeCompare(right)
  )) {
    constants[key] = constantsFromTree(child, `${prefix}${key}.`)
  }

  return constants
}

function normalizeJson(value: JsonValue): JsonValue {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(normalizeJson)
  }

  const normalized: Record<string, JsonValue> = Object.create(null)
  for (const [key, item] of Object.entries(value).toSorted(([left], [right]) =>
    left.localeCompare(right)
  )) {
    normalized[key] = normalizeJson(item)
  }
  return normalized
}

function metadataFromEntry(
  entry: PermissionCatalogEntry
): Readonly<Record<string, JsonValue>> {
  const metadata: Record<string, JsonValue> = Object.create(null)
  if (entry.title !== undefined) {
    metadata.title = entry.title
  }
  if (entry.description !== undefined) {
    metadata.description = entry.description
  }
  if (entry.tags !== undefined) {
    metadata.tags = entry.tags
  }
  if (entry.annotations !== undefined) {
    metadata.annotations = normalizeJson(entry.annotations)
  }
  return metadata
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function quoteTypeScriptString(value: string): string {
  const jsonContents = JSON.stringify(value).slice(1, -1)
  return `'${jsonContents.replaceAll("'", "\\'").replaceAll('\\"', '"')}'`
}

function typeScriptProperty(key: string): string {
  return /^[$A-Z_a-z][$\w]*$/u.test(key) ? key : quoteTypeScriptString(key)
}

function renderTypeScriptValue(value: JsonValue, depth = 0): string {
  if (typeof value === 'string') {
    return quoteTypeScriptString(value)
  }
  if (value === null || typeof value !== 'object') {
    return String(value)
  }

  const indentation = '  '.repeat(depth)
  const itemIndentation = '  '.repeat(depth + 1)
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }
    const items = value
      .map(
        (item) => `${itemIndentation}${renderTypeScriptValue(item, depth + 1)},`
      )
      .join('\n')
    return `[\n${items}\n${indentation}]`
  }

  const entries = Object.entries(value)
  if (entries.length === 0) {
    return '{}'
  }
  const properties = entries
    .map(
      ([key, item]) =>
        `${itemIndentation}${typeScriptProperty(key)}: ${renderTypeScriptValue(
          item,
          depth + 1
        )},`
    )
    .join('\n')
  return `{\n${properties}\n${indentation}}`
}

export function renderPermissionModule(catalog: PermissionCatalog): string {
  const tree = buildTree(catalog)
  const permissionKeys = catalog.permissions.map(({ key }) => key)
  const metadata: Record<
    string,
    Readonly<Record<string, JsonValue>>
  > = Object.create(null)

  for (const entry of catalog.permissions) {
    metadata[entry.key] = metadataFromEntry(entry)
  }

  return `/* This file is generated by Permix. Do not edit it directly. */
import {
  createPermissionConfig,
  createPermissionOverlay,
} from 'permix'
import type {
  ApplyPermissionOverlay,
  Definition as PermixDefinition,
} from 'permix'

export type { PermissionReference } from 'permix/extractor'

export const permissionKeys = ${renderTypeScriptValue(permissionKeys)} as const

export type Permission = (typeof permissionKeys)[number]

export const permissions = ${renderTypeScriptValue(constantsFromTree(tree))} as const

export const permissionMetadata = ${renderTypeScriptValue(metadata)} as const

export const permissionDefinition = ${renderTypeScriptValue(definitionFromTree(tree))} as const

export type ExtractedDefinition = typeof permissionDefinition

export type Definition<
  Overlay extends PermixDefinition = ExtractedDefinition,
> = ApplyPermissionOverlay<ExtractedDefinition, Overlay>

export const definePermissionConfig =
  createPermissionConfig<Permission>()

export const definePermissionOverlay =
  createPermissionOverlay<ExtractedDefinition>()
`
}

export function renderPermissionCatalog(catalog: PermissionCatalog): string {
  return `${stringify(normalizeJson(catalog as unknown as JsonValue))}\n`
}

async function readExisting(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, 'utf-8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }
    throw error
  }
}

async function writeAtomically(
  file: string,
  contents: string
): Promise<boolean> {
  if ((await readExisting(file)) === contents) {
    return false
  }

  await mkdir(path.dirname(file), { recursive: true })
  const temporaryFile = `${file}.${process.pid}.${Date.now()}.tmp`

  try {
    await writeFile(temporaryFile, contents)
    await rename(temporaryFile, file)
  } finally {
    await rm(temporaryFile, { force: true })
  }

  return true
}

export interface GeneratePermissionsResult {
  readonly catalog: PermissionCatalog
  readonly catalogChanged: boolean
  readonly moduleChanged: boolean
}

export interface CheckPermissionsResult {
  readonly catalog: PermissionCatalog
  readonly stale: readonly string[]
  readonly valid: boolean
}

function extractionOptions(options: GeneratePermissionsOptions, cwd: string) {
  return {
    cwd,
    ...(options.include === undefined ? {} : { include: options.include }),
    ...(options.exclude === undefined ? {} : { exclude: options.exclude }),
    ...(options.metadata === undefined ? {} : { metadata: options.metadata }),
  }
}

function outputFiles(options: GeneratePermissionsOptions, cwd: string) {
  return {
    moduleOutput: path.resolve(
      cwd,
      options.moduleOutput ?? '.permix/permissions.ts'
    ),
    catalogOutput: path.resolve(
      cwd,
      options.catalogOutput ?? '.permix/permissions.json'
    ),
  }
}

export async function checkPermissions(
  options: GeneratePermissionsOptions = {}
): Promise<CheckPermissionsResult> {
  const cwd = path.resolve(options.cwd ?? process.cwd())
  const catalog = await extractPermissions(extractionOptions(options, cwd))
  const { moduleOutput, catalogOutput } = outputFiles(options, cwd)
  const expected = new Map([
    [moduleOutput, renderPermissionModule(catalog)],
    [catalogOutput, renderPermissionCatalog(catalog)],
  ])
  const compared = await Promise.all(
    [...expected].map(async ([file, contents]) =>
      (await readExisting(file)) === contents ? undefined : file
    )
  )
  const stale = compared.filter((file): file is string => file !== undefined)

  return {
    catalog,
    stale,
    valid: stale.length === 0,
  }
}

export async function generatePermissions(
  options: GeneratePermissionsOptions = {}
): Promise<GeneratePermissionsResult> {
  const cwd = path.resolve(options.cwd ?? process.cwd())
  const catalog = await extractPermissions(extractionOptions(options, cwd))
  const { moduleOutput, catalogOutput } = outputFiles(options, cwd)
  const moduleContents = renderPermissionModule(catalog)
  const catalogContents = renderPermissionCatalog(catalog)
  const [moduleChanged, catalogChanged] = await Promise.all([
    writeAtomically(moduleOutput, moduleContents),
    writeAtomically(catalogOutput, catalogContents),
  ])

  return {
    catalog,
    catalogChanged,
    moduleChanged,
  }
}
