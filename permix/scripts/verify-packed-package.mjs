import { execFileSync } from 'node:child_process'
import {
  accessSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDirectory = fileURLToPath(new URL('..', import.meta.url))
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'permix-pack-'))

const requiredFiles = [
  'dist/adapter/index.d.mts',
  'dist/adapter/index.mjs',
  'dist/better-auth/index.d.mts',
  'dist/better-auth/index.mjs',
  'dist/clerk/index.d.mts',
  'dist/clerk/index.mjs',
  'dist/clerk/next/index.d.mts',
  'dist/clerk/next/index.mjs',
  'dist/convex/index.d.mts',
  'dist/convex/index.mjs',
  'dist/pdp/index.d.mts',
  'dist/pdp/index.mjs',
  'dist/supabase/index.d.mts',
  'dist/supabase/index.mjs',
  'skills/permix/references/providers.md',
]

const consumerSmoke = `
import { createPermix } from 'permix'
import { createAdapter } from 'permix/adapter'
import { createPdpClient, createPdpHandler } from 'permix/pdp'

for (const [name, value] of Object.entries({
  createAdapter,
  createPdpClient,
  createPdpHandler,
  createPermix,
})) {
  if (typeof value !== 'function') {
    throw new TypeError(\`Missing packed export: \${name}\`)
  }
}
`

try {
  execFileSync('pnpm', ['pack', '--pack-destination', temporaryDirectory], {
    cwd: packageDirectory,
    stdio: 'ignore',
  })
  const tarball = readdirSync(temporaryDirectory).find((path) =>
    path.endsWith('.tgz')
  )
  if (!tarball) {
    throw new Error('pnpm pack did not produce a tarball')
  }

  writeFileSync(
    path.join(temporaryDirectory, 'package.json'),
    JSON.stringify({ private: true, type: 'module' })
  )
  execFileSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      path.join(temporaryDirectory, tarball),
    ],
    {
      cwd: temporaryDirectory,
      stdio: 'inherit',
    }
  )
  writeFileSync(path.join(temporaryDirectory, 'verify.mjs'), consumerSmoke)
  execFileSync(process.execPath, ['verify.mjs'], {
    cwd: temporaryDirectory,
    stdio: 'inherit',
  })

  const installedPackage = path.join(temporaryDirectory, 'node_modules/permix')
  for (const requiredFile of requiredFiles) {
    try {
      accessSync(path.join(installedPackage, requiredFile))
    } catch {
      throw new Error(`Packed package is missing ${requiredFile}`)
    }
  }

  const packedManifest = JSON.parse(
    readFileSync(path.join(installedPackage, 'package.json'), 'utf-8')
  )
  for (const subpath of [
    './adapter',
    './better-auth',
    './clerk',
    './clerk/next',
    './convex',
    './pdp',
    './supabase',
  ]) {
    if (!(subpath in packedManifest.exports)) {
      throw new Error(`Packed package is missing the ${subpath} export`)
    }
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}
