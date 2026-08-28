import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { generatePermissions, watchPermissions } from '../extractor'
import { createPermixPlugin, withPermix } from './config'

vi.mock('../extractor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../extractor')>()
  return {
    ...actual,
    generatePermissions: vi.fn(actual.generatePermissions),
    watchPermissions: vi.fn(async () => ({ close: async () => {} })),
  }
})

const temporaryDirectories: string[] = []

describe(createPermixPlugin, () => {
  afterEach(async () => {
    vi.mocked(generatePermissions).mockReset()
    vi.mocked(watchPermissions).mockClear()
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true }))
    )
  })

  it('generates artifacts before returning the Next config', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'permix-next-config-'))
    temporaryDirectories.push(cwd)
    await writeFile(
      path.join(cwd, 'permissions.ts'),
      `import { permission } from 'permix'
permission('projects.read')
`
    )
    const nextConfig = {
      reactStrictMode: true,
    }
    const withPermixPlugin = createPermixPlugin({
      cwd,
      watch: false,
    })

    await expect(withPermixPlugin(nextConfig)).resolves.toBe(nextConfig)
    await expect(
      readFile(path.join(cwd, '.permix/permissions.json'), 'utf-8')
    ).resolves.toContain('"projects.read"')
  })

  it('supports the direct withPermix config convention', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'permix-next-with-config-'))
    temporaryDirectories.push(cwd)
    await writeFile(
      path.join(cwd, 'permissions.ts'),
      `import { permission } from 'permix'
permission('projects.read')
`
    )
    const nextConfig = {
      poweredByHeader: false,
    }

    await expect(withPermix(nextConfig, { cwd, watch: false })).resolves.toBe(
      nextConfig
    )
  })

  it('returns an empty object when no Next config is provided', async () => {
    vi.mocked(generatePermissions).mockResolvedValue({
      catalog: { schemaVersion: 1, permissions: [] },
      catalogChanged: false,
      moduleChanged: false,
    })

    await expect(
      withPermix(undefined, { watch: false })
    ).resolves.toStrictEqual({})
  })

  it('watches in development when CI is unset and reuses the watcher key', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    const previousCi = process.env.CI
    process.env.NODE_ENV = 'development'
    delete process.env.CI

    try {
      const cwd = await mkdtemp(path.join(tmpdir(), 'permix-next-watch-'))
      temporaryDirectories.push(cwd)
      const options = { cwd }

      await withPermix({}, options)
      await withPermix({}, options)

      expect(watchPermissions).toHaveBeenCalledOnce()
      expect(generatePermissions).not.toHaveBeenCalled()
    } finally {
      process.env.NODE_ENV = previousNodeEnv
      if (previousCi === undefined) {
        delete process.env.CI
      } else {
        process.env.CI = previousCi
      }
    }
  })

  it('logs watcher errors', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(watchPermissions).mockImplementationOnce(
      async (_options, listener) => {
        listener?.({ type: 'error', error: new Error('watch failed') })
        return { close: async () => {} }
      }
    )

    await withPermix({}, { watch: true, cwd: '/tmp' })
    expect(error).toHaveBeenCalledWith(expect.any(Error))
    error.mockRestore()
  })

  it('does not watch when CI is set even in development', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    const previousCi = process.env.CI
    process.env.NODE_ENV = 'development'
    process.env.CI = 'true'

    try {
      vi.mocked(generatePermissions).mockResolvedValue({
        catalog: { schemaVersion: 1, permissions: [] },
        catalogChanged: false,
        moduleChanged: false,
      })

      await withPermix({})
      expect(watchPermissions).not.toHaveBeenCalled()
      expect(generatePermissions).toHaveBeenCalledWith(expect.any(Object))
    } finally {
      process.env.NODE_ENV = previousNodeEnv
      if (previousCi === undefined) {
        delete process.env.CI
      } else {
        process.env.CI = previousCi
      }
    }
  })

  it('includes optional glob and output fields in the watcher key', async () => {
    vi.mocked(watchPermissions).mockResolvedValue({ close: async () => {} })
    await withPermix(
      {},
      {
        watch: true,
        cwd: '/tmp',
        include: ['src/**/*.ts'],
        exclude: ['**/*.test.ts'],
        moduleOutput: 'mod.ts',
        catalogOutput: 'cat.json',
      }
    )
    expect(watchPermissions).toHaveBeenCalledWith(
      expect.objectContaining({
        include: ['src/**/*.ts'],
        exclude: ['**/*.test.ts'],
      }),
      expect.any(Function)
    )
  })
})
