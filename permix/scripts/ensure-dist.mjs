import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import path from 'node:path'

const packageRoot = path.resolve(import.meta.dirname, '..')
const distEntry = path.join(packageRoot, 'dist/core/index.mjs')

try {
  await access(distEntry)
} catch {
  const child = spawn('pnpm', ['run', 'build'], {
    cwd: packageRoot,
    stdio: 'inherit',
    shell: false,
  })
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code) => {
      resolve(code ?? 1)
    })
  })
  if (exitCode !== 0) {
    process.exit(exitCode)
  }
}
