import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { PermissionExtractionError } from './error'
import {
  checkPermissions,
  generatePermissions,
  renderPermissionModule,
} from './generate'
import type { PermissionCatalog } from './types'

const temporaryDirectories: string[] = []

async function createProject(source: string): Promise<{
  readonly cwd: string
  readonly sourceFile: string
}> {
  const cwd = await mkdtemp(path.join(tmpdir(), 'permix-generator-'))
  temporaryDirectories.push(cwd)
  const sourceFile = path.join(cwd, 'permissions.ts')
  await writeFile(sourceFile, source)
  return { cwd, sourceFile }
}

describe('permission artifacts', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true }))
    )
  })

  describe(renderPermissionModule, () => {
    it('renders typed keys, nested constants, metadata, and a definition', () => {
      const catalog: PermissionCatalog = {
        schemaVersion: 1,
        permissions: [
          {
            key: 'projects.read',
            title: 'Read projects',
            references: [{ file: 'src/a.ts', line: 1, column: 1 }],
          },
          {
            key: 'workspace.members.invite',
            references: [{ file: 'src/b.ts', line: 2, column: 3 }],
          },
        ],
      }

      const source = renderPermissionModule(catalog)

      expect(source).toContain(
        'export type Permission = (typeof permissionKeys)[number]'
      )
      expect(source).toContain("read: 'projects.read'")
      expect(source).toContain("invite: 'workspace.members.invite'")
      expect(source).toContain("title: 'Read projects'")
      expect(source).toContain('members: {\n      invite')
      expect(source).toContain('createPermissionOverlay<ExtractedDefinition>()')
    })

    it('rejects paths that cannot form one Permix definition tree', () => {
      const catalog: PermissionCatalog = {
        schemaVersion: 1,
        permissions: [
          {
            key: 'projects.read',
            references: [],
          },
          {
            key: 'projects.admin.delete',
            references: [],
          },
        ],
      }

      expect(() => renderPermissionModule(catalog)).toThrow(
        PermissionExtractionError
      )
    })
  })

  describe(generatePermissions, () => {
    it('writes stable artifacts and leaves valid output on scan failure', async () => {
      const { cwd, sourceFile } = await createProject(
        `import { permission } from 'permix'
permission({ key: 'tasks.comment', title: 'Comment on tasks' })
`
      )

      const first = await generatePermissions({ cwd })
      const moduleFile = path.join(cwd, '.permix/permissions.ts')
      const catalogFile = path.join(cwd, '.permix/permissions.json')
      const validModule = await readFile(moduleFile, 'utf-8')
      const validCatalog = await readFile(catalogFile, 'utf-8')

      expect(first.moduleChanged).toBe(true)
      expect(first.catalogChanged).toBe(true)
      await expect(checkPermissions({ cwd })).resolves.toMatchObject({
        valid: true,
        stale: [],
      })
      await expect(generatePermissions({ cwd })).resolves.toMatchObject({
        moduleChanged: false,
        catalogChanged: false,
      })

      await writeFile(
        sourceFile,
        `import { permission } from 'permix'
permission(getPermissionKey())
`
      )

      await expect(generatePermissions({ cwd })).rejects.toBeInstanceOf(
        PermissionExtractionError
      )
      await expect(readFile(moduleFile, 'utf-8')).resolves.toBe(validModule)
      await expect(readFile(catalogFile, 'utf-8')).resolves.toBe(validCatalog)
      await expect(checkPermissions({ cwd })).rejects.toBeInstanceOf(
        PermissionExtractionError
      )
    })
  })
})
