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
})
