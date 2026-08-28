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
            description: 'View a project',
            tags: ['projects'],
            annotations: { risk: 1 },
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
      expect(source).toContain("description: 'View a project'")
      expect(source).toContain('tags:')
      expect(source).toContain('risk: 1')
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

    it('rejects reserved generated property names', () => {
      for (const key of [
        '__proto__.read',
        'constructor.read',
        'prototype.read',
      ]) {
        expect(() =>
          renderPermissionModule({
            schemaVersion: 1,
            permissions: [{ key, references: [] }],
          })
        ).toThrow(PermissionExtractionError)
      }
    })

    it('quotes TypeScript properties that are not identifiers', () => {
      const source = renderPermissionModule({
        schemaVersion: 1,
        permissions: [
          {
            key: '2fa.enable',
            title: "O'Reilly",
            references: [],
          },
        ],
      })

      expect(source).toContain("'2fa'")
      expect(source).toContain("enable: '2fa.enable'")
      expect(source).toContain("title: 'O\\'Reilly'")
    })

    it('renders an empty catalog', () => {
      const source = renderPermissionModule({
        schemaVersion: 1,
        permissions: [],
      })

      expect(source).toContain('export const permissionKeys = [] as const')
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

    it('writes custom output paths and reports stale artifacts', async () => {
      const { cwd } = await createProject(
        `import { permission } from 'permix'
permission('tasks.comment')
`
      )
      const moduleOutput = 'generated/permissions.ts'
      const catalogOutput = 'generated/catalog.json'

      await generatePermissions({ cwd, moduleOutput, catalogOutput })
      await expect(
        readFile(path.join(cwd, moduleOutput), 'utf-8')
      ).resolves.toContain('tasks.comment')
      await expect(
        checkPermissions({ cwd, moduleOutput, catalogOutput })
      ).resolves.toMatchObject({ valid: true, stale: [] })

      await writeFile(path.join(cwd, catalogOutput), '{}\n')
      const stale = await checkPermissions({ cwd, moduleOutput, catalogOutput })
      expect(stale.valid).toBe(false)
      expect(stale.stale).toHaveLength(1)
    })

    it('rejects permissions that collide at the same tree level', async () => {
      const nestedThenAction = await createProject(
        `import { permission } from 'permix'
permission('projects.read')
permission('projects')
`
      )
      await expect(
        generatePermissions({ cwd: nestedThenAction.cwd })
      ).rejects.toBeInstanceOf(PermissionExtractionError)

      const actionThenNested = await createProject(
        `import { permission } from 'permix'
permission('projects')
permission('projects.read')
`
      )
      await expect(
        generatePermissions({ cwd: actionThenNested.cwd })
      ).rejects.toBeInstanceOf(PermissionExtractionError)
    })
  })
})
