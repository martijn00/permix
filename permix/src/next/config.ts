import path from 'node:path'

import type {
  GeneratePermissionsOptions,
  PermissionWatcher,
} from '../extractor'
import { generatePermissions, watchPermissions } from '../extractor'

export interface PermixNextPluginOptions extends GeneratePermissionsOptions {
  /**
   * Watch source files after the initial extraction.
   *
   * Defaults to `true` during development and `false` otherwise.
   */
  readonly watch?: boolean
}

const activeWatchers = new Map<string, Promise<PermissionWatcher>>()

function watcherKey(options: PermixNextPluginOptions): string {
  return JSON.stringify({
    cwd: path.resolve(options.cwd ?? process.cwd()),
    include: options.include ?? null,
    exclude: options.exclude ?? null,
    moduleOutput: options.moduleOutput ?? null,
    catalogOutput: options.catalogOutput ?? null,
  })
}

async function startWatcher(options: PermixNextPluginOptions): Promise<void> {
  const key = watcherKey(options)
  const existing = activeWatchers.get(key)
  if (existing !== undefined) {
    await existing
    return
  }

  const started = watchPermissions(options, (event) => {
    if (event.type === 'error') {
      console.error(event.error)
    }
  })
  activeWatchers.set(key, started)
  await started
}

/**
 * Enhances a Next.js config and generates permission artifacts before Next
 * starts compiling the application.
 */
export async function withPermix<Config extends object = Record<string, never>>(
  nextConfig?: Config,
  options: PermixNextPluginOptions = {}
): Promise<Config> {
  const shouldWatch =
    options.watch ??
    (process.env.NODE_ENV === 'development' && process.env.CI === undefined)

  if (shouldWatch) {
    await startWatcher(options)
  } else {
    await generatePermissions(options)
  }

  return nextConfig ?? ({} as Config)
}

/**
 * Creates a reusable configured `withPermix` wrapper for config composition.
 */
export function createPermixPlugin(options: PermixNextPluginOptions = {}) {
  return async function configuredWithPermix<
    Config extends object = Record<string, never>,
  >(nextConfig?: Config): Promise<Config> {
    return withPermix(nextConfig, options)
  }
}
