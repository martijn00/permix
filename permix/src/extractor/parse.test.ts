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
    expect(result.diagnostics).toMatchObject([
      {
        code: 'marker-shadowed',
        file: 'src/shadowed.ts',
        line: 2,
      },
    ])
  })
})
