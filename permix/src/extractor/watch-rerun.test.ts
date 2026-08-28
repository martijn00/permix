import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { generatePermissions } from './generate'
import type { PermissionWatchEvent } from './watch'
import { watchPermissions } from './watch'

vi.mock('./generate', () => ({
  generatePermissions: vi.fn(async () => ({
    catalog: { schemaVersion: 1, permissions: [] },
    catalogChanged: true,
    moduleChanged: true,
  })),
}))

const result = {
  catalog: { schemaVersion: 1 as const, permissions: [] },
  catalogChanged: true,
  moduleChanged: true,
}

const temporaryDirectories: string[] = []

describe('watchPermissions mocked generation', () => {
  afterEach(async () => {
    vi.mocked(generatePermissions).mockReset()
    vi.mocked(generatePermissions).mockResolvedValue(result)
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true }))
    )
  })

  it('emits an error event for non-Error generate failures', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'permix-watch-mock-'))
    temporaryDirectories.push(cwd)
    await writeFile(path.join(cwd, 'keep.ts'), 'export {}')

    const events: PermissionWatchEvent[] = []
    const watcher = await watchPermissions({ cwd, debounceMs: 10 }, (event) =>
      events.push(event)
    )

    vi.mocked(generatePermissions).mockRejectedValueOnce('boom')
    await writeFile(path.join(cwd, 'keep.ts'), 'export const x = 1')

    try {
      await vi.waitFor(
        () => {
          expect(events.some((event) => event.type === 'error')).toBe(true)
        },
        { timeout: 3000 }
      )
    } finally {
      await watcher.close()
    }
  })

  it('coalesces overlapping generates and ignores work after close', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'permix-watch-overlap-'))
    temporaryDirectories.push(cwd)
    await writeFile(path.join(cwd, 'keep.ts'), 'export {}')

    let calls = 0
    let releaseSecond: (() => void) | undefined
    vi.mocked(generatePermissions).mockImplementation(async () => {
      calls += 1
      if (calls === 2) {
        await new Promise<void>((resolve) => {
          releaseSecond = resolve
        })
      }
      return result
    })

    const watcher = await watchPermissions({ cwd, debounceMs: 15 })
    await writeFile(path.join(cwd, 'keep.ts'), 'export const a = 1')

    await vi.waitFor(() => {
      expect(calls).toBe(2)
    })

    await writeFile(path.join(cwd, 'keep.ts'), 'export const b = 2')
    await new Promise((resolve) => setTimeout(resolve, 40))

    const closing = watcher.close()
    releaseSecond?.()
    await closing
    expect(calls).toBeGreaterThanOrEqual(2)
  })
})
