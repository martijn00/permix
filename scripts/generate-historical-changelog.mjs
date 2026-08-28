#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const repoUrl = 'https://github.com/letstri/permix'

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf-8',
    ...options,
  }).trim()
}

function npmView(args) {
  return execFileSync('npm', ['view', 'permix', ...args, '--json'], {
    encoding: 'utf-8',
  }).trim()
}

function parseVersion(source) {
  const match = source.match(/"version"\s*:\s*"([^"]+)"/)
  return match?.[1] ?? null
}

function versionAt(sha) {
  for (const filePath of ['permix/package.json', 'package.json']) {
    try {
      const source = git(['show', `${sha}:${filePath}`], {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      const version = parseVersion(source)
      if (version) {
        return version
      }
    } catch {
      // File missing at this commit.
    }
  }
  return null
}

function isBumpSubject(subject) {
  return /^(chore:\s*)?(bump|update)\s+version(\s+to\s+v?\S+)?$/i.test(
    subject.trim()
  )
}

function classify(subject) {
  const text = subject.trim()
  const type = text.split(':')[0] ?? ''
  if (type.includes('!') || /^breaking(\s+change)?(\(.+\))?!?:/i.test(text)) {
    return 'breaking'
  }
  if (/^(feat|feature)(\(.+\))?:/i.test(text)) {
    return 'added'
  }
  if (/^fix(\(.+\))?:/i.test(text)) {
    return 'fixed'
  }
  if (/^docs(\(.+\))?:/i.test(text)) {
    return 'docs'
  }
  return 'changed'
}

function bucketLabel(key) {
  switch (key) {
    case 'breaking': {
      return 'Breaking Changes'
    }
    case 'added': {
      return 'Features'
    }
    case 'fixed': {
      return 'Bug Fixes'
    }
    case 'docs': {
      return 'Documentation'
    }
    case 'changed': {
      return 'Miscellaneous'
    }
    default: {
      throw new Error(`Unhandled changelog bucket: ${String(key)}`)
    }
  }
}

function escapeMd(text) {
  return text.replaceAll('<', '\\<')
}

function dateOnly(iso) {
  return iso.slice(0, 10)
}

const versions = JSON.parse(npmView(['versions']))
const timesRaw = JSON.parse(npmView(['time']))
const times = Array.isArray(timesRaw) ? timesRaw[0] : timesRaw

const bumpLog = git([
  'log',
  '--reverse',
  '--pretty=%H',
  '-G',
  '"version":',
  '--',
  'permix/package.json',
  'package.json',
])
  .split('\n')
  .filter(Boolean)

const versionToSha = new Map()
for (const sha of bumpLog) {
  const version = versionAt(sha)
  if (version) {
    versionToSha.set(version, sha)
  }
}

const mapping = []
const sections = []
const order = ['breaking', 'added', 'fixed', 'docs', 'changed']

for (let i = 0; i < versions.length; i++) {
  const version = versions[i]
  const prev = i > 0 ? versions[i - 1] : null
  const sha = versionToSha.get(version) ?? null
  const prevSha = prev ? (versionToSha.get(prev) ?? null) : null
  const published =
    typeof times[version] === 'string' ? dateOnly(times[version]) : 'unknown'

  mapping.push({ version, sha, published })

  let subjects = []
  if (sha) {
    const range = prevSha ? `${prevSha}..${sha}` : sha
    const log = git(['log', '--no-merges', '--pretty=%s', range])
    subjects = log ? log.split('\n').filter(Boolean) : []
  }

  const buckets = {
    breaking: [],
    added: [],
    fixed: [],
    docs: [],
    changed: [],
  }

  for (const subject of subjects) {
    if (isBumpSubject(subject)) {
      continue
    }
    buckets[classify(subject)].push(subject)
  }

  const compare = prev
    ? `${repoUrl}/compare/v${prev}...v${version}`
    : `${repoUrl}/releases/tag/v${version}`
  const heading = `## [${version}](${compare}) (${published})`

  const lines = [heading, '']
  let hasNotes = false
  for (const key of order) {
    const items = buckets[key]
    if (items.length === 0) {
      continue
    }
    hasNotes = true
    lines.push(`### ${bucketLabel(key)}`, '')
    for (const item of items) {
      lines.push(`* ${escapeMd(item)}`)
    }
    lines.push('')
  }
  if (!hasNotes) {
    lines.push('* Published to npm.', '')
  }
  sections.push(lines.join('\n'))
}

sections.reverse()

const changelog = `${[
  '# Changelog',
  '',
  'All notable changes to `permix` are documented in this file.',
  '',
  'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),',
  'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
  'Entries through 4.1.2 were reconstructed from npm publish dates and git history;',
  'later versions are maintained by Release Please.',
  '',
  ...sections,
]
  .join('\n')
  .replaceAll(/\n{3,}/g, '\n\n')}\n`

writeFileSync(path.resolve(root, 'CHANGELOG.md'), changelog)
writeFileSync(
  path.resolve(root, 'scripts/historical-releases.json'),
  `${JSON.stringify(mapping, null, 2)}\n`
)

console.log(`Wrote CHANGELOG.md with ${versions.length} versions`)
console.log(
  `Mapped SHAs: ${mapping.filter((item) => item.sha).length}/${mapping.length}`
)
const missing = mapping.filter((item) => !item.sha).map((item) => item.version)
if (missing.length > 0) {
  console.log(`Missing SHAs: ${missing.join(', ')}`)
}
