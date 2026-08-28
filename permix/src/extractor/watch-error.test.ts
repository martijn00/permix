import { describe, expect, it, vi } from 'vitest'

import { generatePermissions } from './generate'
import { watchPermissions } from './watch'

const { nextFailure } = vi.hoisted(() => {
  const queue: unknown[] = [new Error('watch failed'), 'boom']
  return {
    nextFailure: () => queue.shift() ?? new Error('watch failed'),
  }
})

vi.mock('./generate', () => ({
  generatePermissions: vi.fn(async () => ({
    catalog: { schemaVersion: 1, permissions: [] },
    catalogChanged: false,
    moduleChanged: false,
  })),
}))

vi.mock('chokidar', () => ({
  watch: () => ({
    once(event: string, callback: (error: unknown) => void) {
      if (event === 'error') {
        queueMicrotask(() => {
          callback(nextFailure())
        })
      }
    },
    off() {
      return undefined
    },
    on() {
      return this
    },
    close: async () => {},
  }),
}))

describe('watchPermissions watcher errors', () => {
  it('rejects Error and non-Error watcher failures', async () => {
    await expect(
      watchPermissions({ cwd: '/tmp/permix-missing-watch' })
    ).rejects.toThrow('watch failed')
    await expect(
      watchPermissions({ cwd: '/tmp/permix-missing-watch' })
    ).rejects.toThrow('boom')
    expect(generatePermissions).toHaveBeenCalledWith(expect.any(Object))
  })
})
