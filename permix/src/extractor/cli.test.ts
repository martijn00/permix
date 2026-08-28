import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { parseCliOptions, runCli } from './cli'
import { watchPermissions } from './watch'

vi.mock('./watch', () => ({
  watchPermissions: vi.fn(async (_options, listener) => {
    listener?.({
      type: 'generated',
      result: {
        catalog: { schemaVersion: 1, permissions: [] },
        catalogChanged: true,
        moduleChanged: true,
      },
    })
    return { close: async () => {} }
  }),
}))

const temporaryDirectories: string[] = []

describe('extract CLI', () => {
  afterEach(async () => {
    vi.mocked(watchPermissions).mockReset()
    vi.mocked(watchPermissions).mockImplementation(
      async (_options, listener) => {
        listener?.({
          type: 'generated',
          result: {
            catalog: { schemaVersion: 1, permissions: [] },
            catalogChanged: true,
            moduleChanged: true,
          },
        })
        return { close: async () => {} }
      }
    )
    vi.restoreAllMocks()
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true }))
    )
  })

  describe(parseCliOptions, () => {
    it('parses repeatable source and output options', () => {
      expect(
        parseCliOptions([
          'extract',
          '--cwd',
          'apps/web',
          '--include',
          'src/**/*.ts',
          '--include',
          'features/**/*.tsx',
          '--exclude',
          '**/*.test.ts',
          '--module-output',
          'src/permissions.generated.ts',
          '--check',
        ])
      ).toStrictEqual({
        check: true,
        help: false,
        watch: false,
        cwd: 'apps/web',
        include: ['src/**/*.ts', 'features/**/*.tsx'],
        exclude: ['**/*.test.ts'],
        moduleOutput: 'src/permissions.generated.ts',
      })
    })

    it('rejects incompatible and unknown arguments', () => {
      expect(() => parseCliOptions(['extract', '--check', '--watch'])).toThrow(
        '--check and --watch'
      )
      expect(() => parseCliOptions(['extract', '--watc'])).toThrow(
        'Unknown argument'
      )
      expect(() => parseCliOptions(['extract', '--cwd'])).toThrow(
        '--cwd requires a value'
      )
    })

    it('parses catalog output without a leading extract command', () => {
      expect(
        parseCliOptions(['--catalog-output', 'catalog.json'])
      ).toMatchObject({
        catalogOutput: 'catalog.json',
        help: false,
      })
    })
  })

  describe(runCli, () => {
    it('generates and checks artifacts', async () => {
      const cwd = await mkdtemp(path.join(tmpdir(), 'permix-cli-'))
      temporaryDirectories.push(cwd)
      await writeFile(
        path.join(cwd, 'permissions.ts'),
        `import { permission } from 'permix'
permission('projects.read')
`
      )
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(runCli(['extract', '--cwd', cwd])).resolves.toBe(0)
      await expect(runCli(['extract', '--cwd', cwd, '--check'])).resolves.toBe(
        0
      )

      await writeFile(
        path.join(cwd, 'permissions.ts'),
        `import { permission } from 'permix'
permission('projects.update')
`
      )
      await expect(runCli(['extract', '--cwd', cwd, '--check'])).resolves.toBe(
        1
      )
    })

    it('prints help and exits 0', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      await expect(runCli(['extract', '--help'])).resolves.toBe(0)
      await expect(runCli(['-h'])).resolves.toBe(0)
      expect(log.mock.calls.join('\n')).toContain('Usage: permix extract')
    })

    it('starts watch mode through watchPermissions', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {})
      await expect(runCli(['extract', '--watch'])).resolves.toBe(0)
      expect(watchPermissions).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Function)
      )
    })

    it('reports extraction diagnostics with a source location', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const cwd = await mkdtemp(path.join(tmpdir(), 'permix-cli-error-'))
      temporaryDirectories.push(cwd)
      await writeFile(
        path.join(cwd, 'permissions.ts'),
        `import { permission } from 'permix'
permission(dynamicKey)
`
      )

      await expect(runCli(['extract', '--cwd', cwd])).resolves.toBe(1)
      expect(error.mock.calls.join('\n')).toContain('dynamic-value')
    })

    it('reports a generic Error from unknown arguments', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      await expect(runCli(['extract', '--unknown-flag'])).resolves.toBe(1)
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('Unknown argument')
      )
    })

    it('stringifies non-Error watch failures', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.mocked(watchPermissions).mockRejectedValueOnce('watch exploded')

      await expect(runCli(['extract', '--watch'])).resolves.toBe(1)
      expect(error).toHaveBeenCalledWith('watch exploded')
    })

    it('forwards include, exclude, and output flags and watch events', async () => {
      const cwd = await mkdtemp(path.join(tmpdir(), 'permix-cli-flags-'))
      temporaryDirectories.push(cwd)
      await writeFile(
        path.join(cwd, 'permissions.ts'),
        `import { permission } from 'permix'
permission('projects.read')
`
      )
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(
        runCli([
          'extract',
          '--cwd',
          cwd,
          '--include',
          '*.ts',
          '--exclude',
          '*.test.ts',
          '--module-output',
          'out.ts',
          '--catalog-output',
          'out.json',
        ])
      ).resolves.toBe(0)

      vi.mocked(watchPermissions).mockImplementation(
        async (_options, listener) => {
          listener?.({
            type: 'error',
            error: new Error('regen failed'),
          })
          listener?.({
            type: 'generated',
            result: {
              catalog: { schemaVersion: 1, permissions: [] },
              catalogChanged: false,
              moduleChanged: true,
            },
          })
          return { close: async () => {} }
        }
      )

      await expect(runCli(['extract', '--cwd', cwd, '--watch'])).resolves.toBe(
        0
      )
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('regen failed')
      )
    })
  })
})
