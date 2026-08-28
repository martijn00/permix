import type {
  Argument,
  BindingPattern,
  CallExpression,
  Expression,
  ObjectExpression,
  ObjectProperty,
  ParamPattern,
} from 'oxc-parser'
import { parseSync, Visitor } from 'oxc-parser'

import type {
  JsonObject,
  JsonValue,
  PermissionMetadata,
} from '../core/permission'
import type { PermissionDiagnostic, PermissionReference } from './types'

export interface ExtractedPermission {
  readonly key: string
  readonly metadata: PermissionMetadata
  readonly reference: PermissionReference
}

interface ParsedPermissionFile {
  readonly diagnostics: readonly PermissionDiagnostic[]
  readonly permissions: readonly ExtractedPermission[]
}

interface StaticValueSuccess {
  readonly ok: true
  readonly value: JsonValue
}

interface StaticValueFailure {
  readonly ok: false
}

type StaticValueResult = StaticValueFailure | StaticValueSuccess

const MARKER_PROPERTIES = new Set([
  'annotations',
  'description',
  'key',
  'tags',
  'title',
])

function unwrapExpression(expression: Expression): Expression {
  if (
    expression.type === 'ParenthesizedExpression' ||
    expression.type === 'TSAsExpression' ||
    expression.type === 'TSNonNullExpression' ||
    expression.type === 'TSSatisfiesExpression' ||
    expression.type === 'TSTypeAssertion'
  ) {
    return unwrapExpression(expression.expression)
  }

  return expression
}

function propertyName(property: ObjectProperty): string | undefined {
  if (property.computed) {
    return undefined
  }

  if (property.key.type === 'Identifier') {
    return property.key.name
  }

  if (
    property.key.type === 'Literal' &&
    typeof property.key.value === 'string'
  ) {
    return property.key.value
  }

  return undefined
}

function readStaticPrimitive(value: Expression): StaticValueResult {
  if (value.type === 'Literal') {
    if (
      value.value === null ||
      typeof value.value === 'boolean' ||
      typeof value.value === 'string'
    ) {
      return { ok: true, value: value.value }
    }

    if (typeof value.value === 'number' && Number.isFinite(value.value)) {
      return { ok: true, value: value.value }
    }

    return { ok: false }
  }

  if (value.type === 'TemplateLiteral') {
    if (value.expressions.length !== 0 || value.quasis.length !== 1) {
      return { ok: false }
    }

    return {
      ok: true,
      value: value.quasis[0]?.value.cooked ?? value.quasis[0]?.value.raw ?? '',
    }
  }

  if (value.type === 'UnaryExpression' && value.operator === '-') {
    const argument = unwrapExpression(value.argument)
    if (
      argument.type === 'Literal' &&
      typeof argument.value === 'number' &&
      Number.isFinite(argument.value)
    ) {
      return { ok: true, value: -argument.value }
    }
  }

  return { ok: false }
}

function readStaticArray(
  value: Extract<Expression, { type: 'ArrayExpression' }>
): StaticValueResult {
  const result: JsonValue[] = []
  for (const element of value.elements) {
    if (element === null || element.type === 'SpreadElement') {
      return { ok: false }
    }

    const item = readStaticJson(element)
    if (!item.ok) {
      return item
    }
    result.push(item.value)
  }
  return { ok: true, value: result }
}

function readStaticObject(value: ObjectExpression): StaticValueResult {
  const result: Record<string, JsonValue> = {}
  for (const property of value.properties) {
    if (
      property.type === 'SpreadElement' ||
      property.kind !== 'init' ||
      property.method ||
      property.shorthand
    ) {
      return { ok: false }
    }

    const name = propertyName(property)
    if (name === undefined || Object.hasOwn(result, name)) {
      return { ok: false }
    }

    const item = readStaticJson(property.value)
    if (!item.ok) {
      return item
    }
    Object.defineProperty(result, name, {
      configurable: true,
      enumerable: true,
      value: item.value,
      writable: true,
    })
  }
  return { ok: true, value: result }
}

function readStaticJson(expression: Expression): StaticValueResult {
  const value = unwrapExpression(expression)

  if (value.type === 'ArrayExpression') {
    return readStaticArray(value)
  }
  if (value.type === 'ObjectExpression') {
    return readStaticObject(value)
  }
  return readStaticPrimitive(value)
}

function lineAndColumn(
  source: string,
  offset: number
): Pick<PermissionReference, 'column' | 'line'> {
  let line = 1
  let lineStart = 0

  for (let index = 0; index < offset; index += 1) {
    if (source.codePointAt(index) === 10) {
      line += 1
      lineStart = index + 1
    }
  }

  return {
    line,
    column: offset - lineStart + 1,
  }
}

function diagnosticAt(
  source: string,
  file: string,
  start: number,
  diagnostic: Omit<PermissionDiagnostic, 'column' | 'file' | 'line'>
): PermissionDiagnostic {
  return {
    ...diagnostic,
    file,
    ...lineAndColumn(source, start),
  }
}

type MarkerDataResult =
  | { readonly diagnostic: PermissionDiagnostic }
  | {
      readonly key: string
      readonly metadata: PermissionMetadata
    }

function validMarkerValue(value: JsonObject): boolean {
  const validTags =
    value.tags === undefined ||
    (Array.isArray(value.tags) &&
      value.tags.every((tag) => typeof tag === 'string'))
  const validAnnotations =
    value.annotations === undefined ||
    (value.annotations !== null &&
      !Array.isArray(value.annotations) &&
      typeof value.annotations === 'object')

  return (
    typeof value.key === 'string' &&
    (value.title === undefined || typeof value.title === 'string') &&
    (value.description === undefined ||
      typeof value.description === 'string') &&
    validTags &&
    validAnnotations
  )
}

function readObjectMarker(
  marker: ObjectExpression,
  source: string,
  file: string
): MarkerDataResult {
  const seen = new Set<string>()
  for (const property of marker.properties) {
    if (
      property.type === 'SpreadElement' ||
      property.kind !== 'init' ||
      property.method ||
      property.shorthand
    ) {
      return {
        diagnostic: diagnosticAt(source, file, property.start, {
          code: 'dynamic-value',
          message:
            'permission() metadata must use static object properties without spreads.',
        }),
      }
    }

    const name = propertyName(property)
    if (name === undefined || !MARKER_PROPERTIES.has(name) || seen.has(name)) {
      return {
        diagnostic: diagnosticAt(source, file, property.start, {
          code: 'invalid-marker',
          message:
            'permission() contains an unknown, computed, or duplicate property.',
        }),
      }
    }
    seen.add(name)
  }

  const staticMarker = readStaticJson(marker)
  if (!staticMarker.ok) {
    return {
      diagnostic: diagnosticAt(source, file, marker.start, {
        code: 'dynamic-value',
        message:
          'permission() keys and metadata must be statically analyzable JSON values.',
      }),
    }
  }

  const value = staticMarker.value as JsonObject
  if (!validMarkerValue(value)) {
    return {
      diagnostic: diagnosticAt(source, file, marker.start, {
        code: 'invalid-marker',
        message:
          'permission() requires a static string key and valid metadata values.',
      }),
    }
  }

  return {
    key: value.key as string,
    metadata: {
      ...(typeof value.title === 'string' ? { title: value.title } : {}),
      ...(typeof value.description === 'string'
        ? { description: value.description }
        : {}),
      ...(Array.isArray(value.tags)
        ? { tags: value.tags as readonly string[] }
        : {}),
      ...(value.annotations === undefined
        ? {}
        : { annotations: value.annotations as JsonObject }),
    },
  }
}

function readMarkerData(
  marker: Expression,
  source: string,
  file: string
): MarkerDataResult {
  if (marker.type === 'Literal' && typeof marker.value === 'string') {
    return { key: marker.value, metadata: {} }
  }

  if (marker.type === 'TemplateLiteral' && marker.expressions.length === 0) {
    return {
      key: marker.quasis[0]?.value.cooked ?? marker.quasis[0]?.value.raw ?? '',
      metadata: {},
    }
  }

  if (marker.type === 'ObjectExpression') {
    return readObjectMarker(marker, source, file)
  }

  return {
    diagnostic: diagnosticAt(source, file, marker.start, {
      code: 'dynamic-value',
      message: 'permission() keys must be static string literals.',
    }),
  }
}

function readMarker(
  call: CallExpression,
  source: string,
  file: string
):
  | { readonly diagnostic: PermissionDiagnostic }
  | { readonly permission: ExtractedPermission } {
  const argument: Argument | undefined = call.arguments[0]
  if (
    call.arguments.length !== 1 ||
    argument === undefined ||
    argument.type === 'SpreadElement'
  ) {
    return {
      diagnostic: diagnosticAt(source, file, call.start, {
        code: 'invalid-marker',
        message: 'permission() requires exactly one static argument.',
      }),
    }
  }

  const marker = unwrapExpression(argument)
  const data = readMarkerData(marker, source, file)
  if ('diagnostic' in data) {
    return data
  }

  if (
    data.key.length === 0 ||
    data.key.split('.').some((segment) => segment.length === 0)
  ) {
    return {
      diagnostic: diagnosticAt(source, file, marker.start, {
        code: 'invalid-permission-key',
        message:
          'Permission keys must contain non-empty dot-separated segments.',
      }),
    }
  }

  return {
    permission: {
      key: data.key,
      metadata: data.metadata,
      reference: {
        file,
        ...lineAndColumn(source, call.start),
      },
    },
  }
}

function isDirectMarkerCall(
  call: CallExpression,
  directNames: ReadonlySet<string>
): boolean {
  const callee = unwrapExpression(call.callee)
  return callee.type === 'Identifier' && directNames.has(callee.name)
}

function isNamespaceMarkerCall(
  call: CallExpression,
  namespaceNames: ReadonlySet<string>
): boolean {
  const callee = unwrapExpression(call.callee)
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.object.type !== 'Identifier'
  ) {
    return false
  }

  return (
    namespaceNames.has(callee.object.name) &&
    callee.property.name === 'permission'
  )
}

export function parsePermissionFile(
  file: string,
  source: string
): ParsedPermissionFile {
  const result = parseSync(file, source, {
    astType: 'ts',
    preserveParens: true,
    showSemanticErrors: true,
    sourceType: 'unambiguous',
  })
  const diagnostics: PermissionDiagnostic[] = result.errors
    .filter((error) => String(error.severity) === 'Error')
    .map((error) => {
      const label = error.labels[0]
      return diagnosticAt(source, file, label?.start ?? 0, {
        code: 'parse-error',
        message: error.message,
      })
    })

  if (diagnostics.length > 0) {
    return { diagnostics, permissions: [] }
  }

  const directNames = new Set<string>()
  const namespaceNames = new Set<string>()
  const importBindings = new Set<string>()
  const importBindingStarts = new Set<number>()

  for (const declaration of result.module.staticImports) {
    if (declaration.moduleRequest.value !== 'permix') {
      continue
    }

    for (const entry of declaration.entries) {
      if (entry.isType) {
        continue
      }

      const importKind = String(entry.importName.kind)
      if (importKind === 'Name' && entry.importName.name === 'permission') {
        directNames.add(entry.localName.value)
        importBindings.add(entry.localName.value)
        importBindingStarts.add(entry.localName.start)
      } else if (importKind === 'NamespaceObject') {
        namespaceNames.add(entry.localName.value)
        importBindings.add(entry.localName.value)
        importBindingStarts.add(entry.localName.start)
      }
    }
  }

  if (importBindings.size === 0) {
    return { diagnostics: [], permissions: [] }
  }

  const permissions: ExtractedPermission[] = []
  const shadowedBindings: {
    readonly name: string
    readonly start: number
  }[] = []

  function checkBinding(pattern: BindingPattern): void {
    if (pattern.type === 'Identifier') {
      if (importBindings.has(pattern.name)) {
        shadowedBindings.push({
          name: pattern.name,
          start: pattern.start,
        })
      }
      return
    }

    if (pattern.type === 'AssignmentPattern') {
      checkBinding(pattern.left)
      return
    }

    if (pattern.type === 'ArrayPattern') {
      for (const element of pattern.elements) {
        if (element === null) {
          continue
        }
        if (element.type === 'RestElement') {
          checkBinding(element.argument)
        } else {
          checkBinding(element)
        }
      }
      return
    }

    for (const property of pattern.properties) {
      if (property.type === 'RestElement') {
        checkBinding(property.argument)
      } else {
        checkBinding(property.value)
      }
    }
  }

  function checkParameter(parameter: ParamPattern): void {
    if (parameter.type === 'TSParameterProperty') {
      checkBinding(parameter.parameter)
    } else if (parameter.type === 'RestElement') {
      checkBinding(parameter.argument)
    } else {
      checkBinding(parameter)
    }
  }

  new Visitor({
    ArrowFunctionExpression(fn) {
      for (const parameter of fn.params) {
        checkParameter(parameter)
      }
    },
    FunctionDeclaration(fn) {
      if (fn.id !== null && !importBindingStarts.has(fn.id.start)) {
        checkBinding(fn.id)
      }
      for (const parameter of fn.params) {
        checkParameter(parameter)
      }
    },
    FunctionExpression(fn) {
      if (fn.id !== null && !importBindingStarts.has(fn.id.start)) {
        checkBinding(fn.id)
      }
      for (const parameter of fn.params) {
        checkParameter(parameter)
      }
    },
    VariableDeclarator(declaration) {
      if (!importBindingStarts.has(declaration.id.start)) {
        checkBinding(declaration.id)
      }
    },
    CatchClause(clause) {
      if (clause.param !== null) {
        checkBinding(clause.param)
      }
    },
    ClassDeclaration(declaration) {
      if (
        declaration.id !== null &&
        !importBindingStarts.has(declaration.id.start)
      ) {
        checkBinding(declaration.id)
      }
    },
    ClassExpression(expression) {
      if (
        expression.id !== null &&
        !importBindingStarts.has(expression.id.start)
      ) {
        checkBinding(expression.id)
      }
    },
    TSDeclareFunction(fn) {
      if (fn.id !== null && !importBindingStarts.has(fn.id.start)) {
        checkBinding(fn.id)
      }
      for (const parameter of fn.params) {
        checkParameter(parameter)
      }
    },
    TSEmptyBodyFunctionExpression(fn) {
      if (fn.id !== null && !importBindingStarts.has(fn.id.start)) {
        checkBinding(fn.id)
      }
      for (const parameter of fn.params) {
        checkParameter(parameter)
      }
    },
    CallExpression(call) {
      if (
        !isDirectMarkerCall(call, directNames) &&
        !isNamespaceMarkerCall(call, namespaceNames)
      ) {
        return
      }

      const extracted = readMarker(call, source, file)
      if ('diagnostic' in extracted) {
        diagnostics.push(extracted.diagnostic)
      } else {
        permissions.push(extracted.permission)
      }
    },
  }).visit(result.program)

  const shadowedBinding = shadowedBindings[0]
  if (shadowedBinding !== undefined) {
    diagnostics.push(
      diagnosticAt(source, file, shadowedBinding.start, {
        code: 'marker-shadowed',
        message: `The imported permission marker "${shadowedBinding.name}" is shadowed by a local binding.`,
      })
    )
  }

  return {
    diagnostics,
    permissions: diagnostics.length === 0 ? permissions : [],
  }
}
