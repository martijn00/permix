import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fixture = fileURLToPath(
  new URL('../src/supabase/fixtures/rls.fixture.sql', import.meta.url)
)
const workdir = fileURLToPath(new URL('../test/supabase-rls', import.meta.url))
const migrationsDirectory = path.join(workdir, 'supabase/migrations')
const migration = path.join(
  migrationsDirectory,
  '20260828000000_provider_adapter_rls.sql'
)

mkdirSync(migrationsDirectory, { recursive: true })
copyFileSync(fixture, migration)

try {
  execFileSync(
    'supabase',
    ['db', 'reset', '--local', '--workdir', workdir, '--yes'],
    { stdio: 'inherit' }
  )
} finally {
  rmSync(migrationsDirectory, { recursive: true, force: true })
}
