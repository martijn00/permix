import path from 'node:path'

import { importChokidar } from './deps'
import { PermissionExtractionError } from './error'
import { createPermissionFileCache } from './extract'
import { generatePermissions } from './generate'
import type { GeneratePermissionsResult } from './generate'
import type { GeneratePermissionsOptions } from './types'

export interface WatchPermissionsOptions extends GeneratePermissionsOptions {
  readonly debounceMs?: number
}

export type PermissionWatchEvent =
  | {
      readonly type: 'error'
      readonly error: Error
    }
  | {
      readonly type: 'generated'
      readonly result: GeneratePermissionsResult
    }

export interface PermissionWatcher {
  readonly close: () => Promise<void>
}

export type PermissionWatchListener = (event: PermissionWatchEvent) => void

const WATCH_IGNORES = [
  /[/\\]\.git[/\\]/,
  /[/\\]\.next[/\\]/,
  /[/\\]\.nuxt[/\\]/,
  /[/\\]\.output[/\\]/,
  /[/\\]\.permix[/\\]/,
  /[/\\]coverage[/\\]/,
  /[/\\]dist[/\\]/,
  /[/\\]node_modules[/\\]/,
]

/**
 * Watches a source root and regenerates artifacts from an incremental parse cache.
 */
export async function watchPermissions(
  options: WatchPermissionsOptions = {},
  listener?: PermissionWatchListener
): Promise<PermissionWatcher> {
  const cwd = path.resolve(options.cwd ?? process.cwd())
  const debounceMs = options.debounceMs ?? 50
  const cache = options.cache ?? createPermissionFileCache()
  let timer: ReturnType<typeof setTimeout> | undefined
  let running: Promise<void> | undefined
  let rerun = false
  let closed = false

  async function generate(force = false): Promise<void> {
    if (closed) {
      return
    }

    if (running !== undefined) {
      rerun = true
      await running
      return
    }

    running = generatePermissions({
      ...options,
      cwd,
      cache,
      ...(force ? { force: true } : {}),
    })
      .then((result) => {
        listener?.({ type: 'generated', result })
      })
      .catch((error: unknown) => {
        listener?.({
          type: 'error',
          error:
            error instanceof Error
              ? error
              : new PermissionExtractionError([
                  {
                    code: 'invalid-marker',
                    file: '<watcher>',
                    message: String(error),
                  },
                ]),
        })
      })
      .finally(async () => {
        running = undefined
        if (rerun) {
          rerun = false
          await generate()
        }
      })

    await running
  }

  const initialResult = await generatePermissions({
    ...options,
    cwd,
    cache,
    force: true,
  })
  listener?.({ type: 'generated', result: initialResult })

  const { watch } = await importChokidar()
  const watcher = watch(cwd, {
    ignoreInitial: true,
    ignored: WATCH_IGNORES,
  })

  await new Promise<void>((resolve, reject) => {
    const handleReady = () => {
      watcher.off('error', handleError)
      resolve()
    }
    const handleError = (error: unknown) => {
      watcher.off('ready', handleReady)
      reject(error instanceof Error ? error : new Error(String(error)))
    }

    watcher.once('ready', handleReady)
    watcher.once('error', handleError)
  })

  watcher.on('all', (event, filePath) => {
    if (typeof filePath === 'string' && filePath.length > 0) {
      cache.delete(path.resolve(filePath))
    }
    if (event === 'unlinkDir') {
      cache.clear()
    }
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = undefined
      void generate(options.force === true)
    }, debounceMs)
  })

  return {
    async close() {
      closed = true
      if (timer !== undefined) {
        clearTimeout(timer)
      }
      await watcher.close()
      await running
    },
  }
}
