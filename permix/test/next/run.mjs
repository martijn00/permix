import { spawn } from 'node:child_process'
import { cp, mkdir, readFile, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import path from 'node:path'

const here = import.meta.dirname
const require = createRequire(import.meta.url)
const permixRoot = path.resolve(here, '../..')

const versions = [
  { id: '15.5.24', alias: 'next-15', ppr: false, typescript: 'typescript59' },
  { id: '16.0.11', alias: 'next-16-0', ppr: false, typescript: 'typescript59' },
  { id: '16.3.3', alias: 'next-16-3', ppr: true, typescript: 'typescript' },
]

function packageDir(specifier) {
  return path.dirname(require.resolve(`${specifier}/package.json`))
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Failed to allocate a port'))
        return
      }
      const port = address.port
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve(port)
      })
    })
    server.on('error', reject)
  })
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(
        new Error(`${command} ${args.join(' ')} failed (${code ?? signal})`)
      )
    })
  })
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' })
      await response.arrayBuffer()
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function prepare(version) {
  const dest = path.join(here, '.scratch', version.id)
  await rm(dest, { recursive: true, force: true })
  await cp(path.join(here, 'src'), dest, { recursive: true })
  if (version.ppr) {
    await cp(path.join(here, 'src-ppr'), dest, { recursive: true })
    await rm(path.join(dest, 'app/layout.tsx'), { force: true })
    await rm(path.join(dest, 'app/page.tsx'), { force: true })
  }

  const modules = path.join(dest, 'node_modules')
  await mkdir(modules, { recursive: true })
  await symlink(packageDir(version.alias), path.join(modules, 'next'))
  await symlink(packageDir('react'), path.join(modules, 'react'))
  await symlink(packageDir('react-dom'), path.join(modules, 'react-dom'))
  await symlink(packageDir(version.typescript), path.join(modules, 'typescript'))
  await symlink(permixRoot, path.join(modules, 'permix'))
  return dest
}

async function nextBin(alias) {
  const nextPackage = packageDir(alias)
  return path.join(nextPackage, 'dist/bin/next')
}

async function assertPermissionCatalog(dest) {
  const output = path.join(dest, '.permix/permissions.json')
  const catalog = JSON.parse(await readFile(output, 'utf-8'))
  const hasIntegrationPermission = catalog.permissions.some(
    (entry) => entry.key === 'integration.read'
  )
  if (!hasIntegrationPermission) {
    throw new Error(`Missing integration.read in ${output}`)
  }
}

async function withServer(version, dest, fn) {
  const port = await getFreePort()
  const baseURL = `http://127.0.0.1:${port}`
  const bin = await nextBin(version.alias)
  const child = spawn(process.execPath, [bin, 'start', '-p', String(port)], {
    cwd: dest,
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  })

  const stop = async () => {
    if (child.pid && process.platform !== 'win32') {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        child.kill('SIGTERM')
      }
    } else {
      child.kill('SIGTERM')
    }
  }

  try {
    await waitForServer(baseURL)
    await fn(baseURL)
  } finally {
    await stop()
  }
}

async function main() {
  const dist = path.join(permixRoot, 'dist/core/index.mjs')
  try {
    await import(path.join(permixRoot, 'dist/next/index.mjs'))
  } catch {
    throw new Error(
      `permix must be built before running Next fixtures (missing ${dist}). Run pnpm --filter permix build.`
    )
  }

  const only = process.env.PERMIX_NEXT_VERSION
  const selected = only
    ? versions.filter((version) => version.id === only)
    : versions
  if (only && selected.length === 0) {
    throw new Error(`Unknown PERMIX_NEXT_VERSION: ${only}`)
  }

  for (const version of selected) {
    console.log(`\n=== Next ${version.id} ===`)
    const dest = await prepare(version)
    const bin = await nextBin(version.alias)
    await run(process.execPath, [bin, 'build'], {
      cwd: dest,
      env: {
        ...process.env,
        EXPOSE_TESTING_API: '1',
        PERMIX_NEXT_VERSION: version.id,
      },
    })
    await assertPermissionCatalog(dest)
    await withServer(version, dest, async (baseURL) => {
      await run(
        'pnpm',
        ['exec', 'playwright', 'test', '--config', 'playwright.config.ts'],
        {
          cwd: here,
          env: {
            ...process.env,
            BASE_URL: baseURL,
            PERMIX_NEXT_VERSION: version.id,
          },
        }
      )
    })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
