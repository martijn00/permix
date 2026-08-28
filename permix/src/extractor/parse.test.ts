import { describe, expect, it } from 'vitest'

import { parsePermissionFile } from './parse'

describe(parsePermissionFile, () => {
  it('extracts aliased and namespace markers with static metadata', () => {
    const source = `import { permission as mark } from 'permix'
import * as permix from 'permix'

export const update = mark({
  key: 'projects.update',
  title: 'Update project',
  tags: ['projects', 'write'],
  annotations: { risk: 2, elevated: true, owner: null },
} as const)

export const invite = permix.permission(\`workspace.members.invite\`)
`

    const result = parsePermissionFile('src/permissions.ts', source)

    expect(result.diagnostics).toStrictEqual([])
    expect(result.permissions).toStrictEqual([
      {
        key: 'projects.update',
        metadata: {
          title: 'Update project',
          tags: ['projects', 'write'],
          annotations: {
            risk: 2,
            elevated: true,
            owner: null,
          },
        },
        reference: {
          file: 'src/permissions.ts',
          line: 4,
          column: 23,
        },
      },
      {
        key: 'workspace.members.invite',
        metadata: {},
        reference: {
          file: 'src/permissions.ts',
          line: 11,
          column: 23,
        },
      },
    ])
  })

  it('ignores unrelated functions named permission', () => {
    const source = `const permission = (key: string) => key
permission(dynamicKey)
`

    expect(parsePermissionFile('src/unrelated.ts', source)).toStrictEqual({
      diagnostics: [],
      permissions: [],
    })
  })

  it('rejects dynamic keys and metadata', () => {
    const source = `import { permission } from 'permix'
const key = 'projects.update'
permission(key)
permission({ key: 'projects.read', title: getTitle() })
`

    const result = parsePermissionFile('src/dynamic.ts', source)

    expect(result.permissions).toStrictEqual([])
    expect(result.diagnostics).toMatchObject([
      {
        code: 'dynamic-value',
        file: 'src/dynamic.ts',
        line: 3,
      },
      {
        code: 'dynamic-value',
        file: 'src/dynamic.ts',
        line: 4,
      },
    ])
  })

  it('rejects invalid permission paths and marker properties', () => {
    const source = `import { permission } from 'permix'
permission('projects..update')
permission({ key: 'projects.read', titel: 'Read project' })
`

    const result = parsePermissionFile('src/invalid.ts', source)

    expect(result.permissions).toStrictEqual([])
    expect(result.diagnostics).toMatchObject([
      { code: 'invalid-permission-key', line: 2 },
      { code: 'invalid-marker', line: 3 },
    ])
  })

  it('fails conservatively when the imported marker is shadowed', () => {
    const source = `import { permission } from 'permix'
function run(permission: (key: string) => string) {
  return permission('projects.update')
}
`

    const result = parsePermissionFile('src/shadowed.ts', source)

    expect(result.permissions).toStrictEqual([])
    expect(parsePermissionFile('src/syntax.ts', 'permission(')).toMatchObject({
      permissions: [],
      diagnostics: [{ code: 'parse-error', file: 'src/syntax.ts' }],
    })
  })

  it('rejects permission calls with no arguments or extra arguments', () => {
    const source = `import { permission } from 'permix'
permission()
permission('projects.read', { title: 'Read' })
`

    expect(
      parsePermissionFile('src/arity.ts', source).diagnostics
    ).toMatchObject([
      { code: 'invalid-marker', line: 2 },
      { code: 'invalid-marker', line: 3 },
    ])
  })

  it('rejects computed and numeric marker properties', () => {
    const source = `import { permission } from 'permix'
const field = 'key'
permission({ [field]: 'projects.read' })
permission({ 0: 'projects.read' })
`

    expect(
      parsePermissionFile('src/computed.ts', source).diagnostics
    ).toMatchObject([
      { code: 'invalid-marker', line: 3 },
      { code: 'invalid-marker', line: 4 },
    ])
  })

  it('accepts a static template literal key', () => {
    const source = `import { permission } from 'permix'
permission(\`projects.read\`)
`

    expect(
      parsePermissionFile('src/template.ts', source).permissions
    ).toMatchObject([{ key: 'projects.read' }])
  })

  it('rejects concatenated dynamic keys', () => {
    const source = `import { permission } from 'permix'
permission('projects.' + 'read')
`

    expect(
      parsePermissionFile('src/concat.ts', source).diagnostics
    ).toMatchObject([{ code: 'dynamic-value', line: 2 }])
  })

  it('ignores a default import of permix', () => {
    const source = `import permix from 'permix'
permix('projects.read')
permix.permission('projects.update')
`

    expect(parsePermissionFile('src/default.ts', source)).toStrictEqual({
      diagnostics: [],
      permissions: [],
    })
  })

  it('rejects non-JSON annotation primitives', () => {
    const source = `import { permission } from 'permix'
permission({ key: 'projects.read', annotations: { risk: undefined } })
`

    expect(
      parsePermissionFile('src/annotations.ts', source).diagnostics
    ).toMatchObject([{ code: 'dynamic-value', line: 2 }])
  })

  it.each([
    [
      'arrow parameter',
      `import { permission } from 'permix'
const run = (permission: (key: string) => string) => permission('projects.read')
`,
    ],
    [
      'function expression name',
      `import { permission } from 'permix'
const run = function permission() { return permission }
`,
    ],
    [
      'variable declarator',
      `import { permission } from 'permix'
const permission = 'projects.read'
`,
    ],
    [
      'catch clause',
      `import { permission } from 'permix'
try { permission('projects.read') } catch (permission) {}
`,
    ],
    [
      'class declaration',
      `import { permission } from 'permix'
class permission {}
`,
    ],
    [
      'class expression',
      `import { permission } from 'permix'
const C = class permission {}
`,
    ],
    [
      'array binding',
      `import { permission } from 'permix'
const [permission] = []
`,
    ],
    [
      'object binding',
      `import { permission } from 'permix'
const { permission } = { permission: 1 }
`,
    ],
    [
      'object rest binding',
      `import { permission } from 'permix'
const { permission, ...rest } = { permission: 1 }
`,
    ],
    [
      'assignment pattern',
      `import { permission } from 'permix'
function run(permission = 'x') { return permission }
`,
    ],
    [
      'rest parameter',
      `import { permission } from 'permix'
function run(...permission: string[]) { return permission }
`,
    ],
  ])('reports marker-shadowed for %s', (_name, source) => {
    expect(
      parsePermissionFile('src/shadow.ts', source).diagnostics
    ).toMatchObject([{ code: 'marker-shadowed' }])
  })

  it('extracts parenthesized and type-asserted static keys', () => {
    const source = `import { permission } from 'permix'
permission(('projects.read'))
permission('projects.update' as const)
`

    expect(
      parsePermissionFile('src/parens.ts', source).permissions
    ).toMatchObject([{ key: 'projects.read' }, { key: 'projects.update' }])
  })

  it('rejects spreads, shorthand, methods, and duplicate marker properties', () => {
    const source = `import { permission } from 'permix'
const extra = { title: 'Read' }
permission({ ...extra, key: 'projects.read' })
permission({ key: 'projects.update', title })
permission({ key: 'projects.delete', run() { return 1 } })
permission({ key: 'projects.create', key: 'projects.other' })
`

    expect(
      parsePermissionFile('src/shapes.ts', source).diagnostics.length
    ).toBeGreaterThan(0)
  })

  it('accepts empty tags, negative numbers, and boolean annotations', () => {
    const source = `import { permission } from 'permix'
permission({
  key: 'projects.read',
  tags: [],
  annotations: { risk: -1, elevated: true, owner: null },
})
`

    expect(
      parsePermissionFile('src/json.ts', source).permissions
    ).toMatchObject([
      {
        key: 'projects.read',
        metadata: {
          tags: [],
          annotations: { risk: -1, elevated: true, owner: null },
        },
      },
    ])
  })

  it('rejects empty permission keys', () => {
    const source = `import { permission } from 'permix'
permission('')
permission('projects.')
`

    expect(
      parsePermissionFile('src/empty.ts', source).diagnostics
    ).toMatchObject([
      { code: 'invalid-permission-key' },
      { code: 'invalid-permission-key' },
    ])
  })

  it('ignores type-only permix imports', () => {
    const source = `import type { permission } from 'permix'
permission('projects.read')
`

    expect(parsePermissionFile('src/types.ts', source)).toStrictEqual({
      diagnostics: [],
      permissions: [],
    })
  })

  it('rejects a spread argument', () => {
    const source = `import { permission } from 'permix'
permission(...['projects.read'])
`

    expect(
      parsePermissionFile('src/spread.ts', source).diagnostics
    ).toMatchObject([{ code: 'invalid-marker' }])
  })

  it('reports shadowing from constructor parameter properties and declare functions', () => {
    expect(
      parsePermissionFile(
        'src/ctor.ts',
        `import { permission } from 'permix'
class Box {
  constructor(private permission: string) {}
}
`
      ).diagnostics
    ).toMatchObject([{ code: 'marker-shadowed' }])

    expect(
      parsePermissionFile(
        'src/declare.ts',
        `import { permission } from 'permix'
declare function permission(): void
`
      ).diagnostics
    ).toMatchObject([{ code: 'marker-shadowed' }])
  })

  it('extracts quoted keys, static templates, and skips unrelated imports', () => {
    const source = `import fs from 'node:fs'
import { permission } from 'permix'
permission({
  'key': 'projects.read',
  title: \`Read\`,
  description: 'View',
})
void fs
`

    expect(
      parsePermissionFile('src/quoted.ts', source).permissions
    ).toMatchObject([
      {
        key: 'projects.read',
        metadata: { title: 'Read', description: 'View' },
      },
    ])
  })

  it('rejects non-finite numbers, interpolated templates, and invalid metadata', () => {
    const source = `import { permission } from 'permix'
permission({ key: 'projects.read', annotations: { n: Infinity } })
permission({ key: 'projects.read', title: \`Read \${name}\` })
permission({ key: 'projects.read', title: 1 })
permission({ key: 'projects.read', tags: [1] })
permission({ key: 'projects.read', description: true })
`

    expect(
      parsePermissionFile('src/invalid-json.ts', source).diagnostics
    ).toMatchObject([
      { code: 'dynamic-value' },
      { code: 'dynamic-value' },
      { code: 'invalid-marker' },
      { code: 'invalid-marker' },
      { code: 'invalid-marker' },
    ])
  })

  it('rejects spreads, holes, shorthand, methods, and computed names', () => {
    const source = `import { permission } from 'permix'
const risk = 1
permission({ key: 'projects.read', tags: [...['a']] })
permission({ key: 'projects.read', tags: ['a',, 'b'] })
permission({ key: 'projects.read', annotations: { ...{} } })
permission({ key: 'projects.read', annotations: { risk } })
permission({ key: 'projects.read', annotations: { toJSON() { return 1 } } })
permission({ ['key']: 'projects.read' })
permission({ key: 'projects.read', annotations: { 1: 'x' } })
`

    expect(
      parsePermissionFile('src/shapes.ts', source).diagnostics.length
    ).toBeGreaterThan(0)
  })

  it('reports shadowing from remaining binding patterns', () => {
    const cases = [
      `import { permission } from 'permix'
function run(...permission: string[]) { return permission }
`,
      `import { permission } from 'permix'
const [, permission] = ['a', 'b']
`,
      `import { permission } from 'permix'
const { ...permission } = { a: 1 }
`,
      `import { permission } from 'permix'
function run(permission = 'x') { return permission }
`,
      `import { permission } from 'permix'
try { throw 1 } catch (permission) { void permission }
`,
      `import { permission } from 'permix'
const C = class permission {}
`,
      `import { permission } from 'permix'
const f = function permission() { return 1 }
void f
`,
    ]

    for (const source of cases) {
      const result = parsePermissionFile('src/shadow.ts', source)
      expect(
        result.diagnostics.some(
          (diagnostic) => diagnostic.code === 'marker-shadowed'
        )
      ).toBe(true)
    }

    expect(
      parsePermissionFile(
        'src/abstract.ts',
        `import { permission } from 'permix'
abstract class Box {
  abstract permission(): void
}
permission('projects.read')
`
      ).permissions
    ).toMatchObject([{ key: 'projects.read' }])
  })
})
