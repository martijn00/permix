#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const apply = process.argv.includes('--apply')
const push = process.argv.includes('--push')

function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf-8',
  }).trim()
}

const mapping = JSON.parse(
  readFileSync(path.resolve(root, 'scripts/historical-releases.json'), 'utf-8')
)

const existing = new Set(
  git(['tag', '--list', 'v*']).split('\n').filter(Boolean)
)

let created = 0
let skipped = 0
let missingSha = 0

for (const entry of mapping) {
  const tag = `v${entry.version}`
  if (!entry.sha) {
    missingSha++
    console.log(`skip ${tag}: no mapped SHA`)
    continue
  }
  if (existing.has(tag)) {
    skipped++
    continue
  }
  if (!apply) {
    console.log(`would tag ${tag} -> ${entry.sha}`)
    created++
    continue
  }
  git(['tag', '-a', tag, entry.sha, '-m', tag])
  existing.add(tag)
  created++
  console.log(`tagged ${tag} -> ${entry.sha}`)
}

if (apply && push) {
  git(['push', 'origin', '--tags'])
  console.log('pushed tags to origin')
}

console.log(
  `${apply ? 'created' : 'would create'} ${created}, skipped ${skipped}, missing SHA ${missingSha}`
)
if (!apply) {
  console.log(
    'Re-run with --apply to create annotated tags. Add --push to push them.'
  )
}
