import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PermissionWatchEvent } from './watch'
import { watchPermissions } from './watch'

const temporaryDirectories: string[] = []

describe(watchPermissions, () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true }))
    )
  })

  it('regenerates after add, edit, and delete events', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'permix-watch-'))
    temporaryDirectories.push(cwd)
    const sourceFile = path.join(cwd, 'permissions.ts')
    await writeFile(
      sourceFile,
      `import { permission } from 'permix'
permission('projects.read')
`
    )
    const events: PermissionWatchEvent[] = []
    const watcher = await watchPermissions({ cwd, debounceMs: 10 }, (event) =>
      events.push(event)
    )

    try {
      await writeFile(
        sourceFile,
        `import { permission } from 'permix'
permission('projects.update')
`
      )

      await vi.waitFor(
        () => {
          const generated = events.filter((event) => event.type === 'generated')
          expect(generated.at(-1)?.result.catalog.permissions[0]?.key).toBe(
            'projects.update'
          )
        },
        { timeout: 3000 }
      )

      await rm(sourceFile)
      await vi.waitFor(
        () => {
          const generated = events.filter((event) => event.type === 'generated')
          expect(generated.at(-1)?.result.catalog.permissions).toStrictEqual([])
        },
        { timeout: 3000 }
      )
    } finally {
      await watcher.close()
    }
  })

  it('keeps cached files across edits, deletes, and renames', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'permix-watch-incr-'))
    temporaryDirectories.push(cwd)
    const readFile = path.join(cwd, 'read.ts')
    const updateFile = path.join(cwd, 'update.ts')
    await writeFile(
      readFile,
      `import { permission } from 'permix'
permission('projects.read')
`
    )
    await writeFile(
      updateFile,
      `import { permission } from 'permix'
permission('projects.update')
`
    )

    const events: PermissionWatchEvent[] = []
    const watcher = await watchPermissions({ cwd, debounceMs: 10 }, (event) =>
      events.push(event)
    )

    try {
      const initial = events.at(-1)
      expect(initial?.type).toBe('generated')
      if (initial?.type !== 'generated') {
        throw new Error('expected an initial generated event')
      }
      expect(
        initial.result.catalog.permissions.map((item) => item.key)
      ).toStrictEqual(['projects.read', 'projects.update'])

      await writeFile(
        updateFile,
        `import { permission } from 'permix'
permission('projects.publish')
`
      )
      await vi.waitFor(
        () => {
          const generated = events.filter((event) => event.type === 'generated')
          expect(
            generated.at(-1)?.result.catalog.permissions.map((item) => item.key)
          ).toStrictEqual(['projects.publish', 'projects.read'])
        },
        { timeout: 3000 }
      )

      const renamed = path.join(cwd, 'renamed-read.ts')
      await writeFile(
        renamed,
        `import { permission } from 'permix'
permission('projects.read')
`
      )
      await rm(readFile)
      await vi.waitFor(
        () => {
          const generated = events.filter((event) => event.type === 'generated')
          expect(
            generated.at(-1)?.result.catalog.permissions.map((item) => item.key)
          ).toStrictEqual(['projects.publish', 'projects.read'])
        },
        { timeout: 3000 }
      )

      await rm(updateFile)
      await vi.waitFor(
        () => {
          const generated = events.filter((event) => event.type === 'generated')
          expect(
            generated.at(-1)?.result.catalog.permissions.map((item) => item.key)
          ).toStrictEqual(['projects.read'])
        },
        { timeout: 3000 }
      )
    } finally {
      await watcher.close()
    }
  })
})
