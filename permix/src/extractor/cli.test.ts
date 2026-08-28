import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { parseCliOptions, runCli } from './cli'

const temporaryDirectories: string[] = []

describe('extract CLI', () => {
  afterEach(async () => {
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
  })
})
