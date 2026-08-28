import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createPermixPlugin, withPermix } from './config'

const temporaryDirectories: string[] = []

describe(createPermixPlugin, () => {
  afterEach(async () => {
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
    const withPermix = createPermixPlugin({
      cwd,
      watch: false,
    })

    await expect(withPermix(nextConfig)).resolves.toBe(nextConfig)
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
})
