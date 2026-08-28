import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { PermissionExtractionError } from './error'
import { createPermissionFileCache, extractPermissions } from './extract'

const temporaryDirectories: string[] = []

async function createProject(
  files: Readonly<Record<string, string>>
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'permix-extractor-'))
  temporaryDirectories.push(directory)

  await Promise.all(
    Object.entries(files).map(async ([file, source]) => {
      const absoluteFile = path.join(directory, file)
      await mkdir(path.dirname(absoluteFile), { recursive: true })
      await writeFile(absoluteFile, source)
    })
  )

  return directory
}

describe(extractPermissions, () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true }))
    )
  })

  it('sorts keys and deduplicates references deterministically', async () => {
    const cwd = await createProject({
      'src/a.ts': `import { permission } from 'permix'
permission({ key: 'projects.read', title: 'Read projects' })
`,
      'src/z.ts': `import { permission as mark } from 'permix'
mark('workspace.members.invite')
mark('projects.read')
`,
    })

    await expect(extractPermissions({ cwd })).resolves.toStrictEqual({
      schemaVersion: 1,
      permissions: [
        {
          key: 'projects.read',
          title: 'Read projects',
          references: [
            { file: 'src/a.ts', line: 2, column: 1 },
            { file: 'src/z.ts', line: 3, column: 1 },
          ],
        },
        {
          key: 'workspace.members.invite',
          references: [{ file: 'src/z.ts', line: 2, column: 1 }],
        },
      ],
    })
  })

  it('applies central metadata after inline metadata', async () => {
    const cwd = await createProject({
      'src/permissions.ts': `import { permission } from 'permix'
permission({ key: 'projects.read', title: 'Inline title' })
`,
    })

    const catalog = await extractPermissions({
      cwd,
      metadata: {
        'projects.read': {
          title: 'Configured title',
          description: 'Read project details.',
        },
      },
    })

    expect(catalog.permissions[0]).toMatchObject({
      key: 'projects.read',
      title: 'Configured title',
      description: 'Read project details.',
    })
  })

  it('rejects conflicting duplicate metadata', async () => {
    const cwd = await createProject({
      'src/a.ts': `import { permission } from 'permix'
permission({ key: 'projects.read', title: 'First title' })
`,
      'src/b.ts': `import { permission } from 'permix'
permission({ key: 'projects.read', title: 'Second title' })
`,
    })

    await expect(extractPermissions({ cwd })).rejects.toMatchObject({
      diagnostics: [
        {
          code: 'conflicting-metadata',
          file: 'src/b.ts',
        },
      ],
    })
  })

  it('rejects metadata entries without an extracted permission', async () => {
    const cwd = await createProject({})

    await expect(
      extractPermissions({
        cwd,
        metadata: {
          'projects.deleted': {
            title: 'Stale permission',
          },
        },
      })
    ).rejects.toBeInstanceOf(PermissionExtractionError)
  })

  it('reuses parse results when mtime and size are unchanged', async () => {
    const cwd = await createProject({
      'src/a.ts': `import { permission } from 'permix'
permission('projects.read')
`,
      'src/b.ts': `import { permission } from 'permix'
permission('projects.update')
`,
    })
    const cache = createPermissionFileCache()

    const first = await extractPermissions({ cwd, cache })
    expect(cache.misses).toBe(2)
    expect(cache.hits).toBe(0)
    expect(first.permissions.map((permission) => permission.key)).toStrictEqual(
      ['projects.read', 'projects.update']
    )

    const second = await extractPermissions({ cwd, cache })
    expect(cache.misses).toBe(0)
    expect(cache.hits).toBe(2)
    expect(second).toStrictEqual(first)

    const forced = await extractPermissions({ cwd, cache, force: true })
    expect(cache.misses).toBe(2)
    expect(cache.hits).toBe(0)
    expect(forced).toStrictEqual(first)
  })
})
