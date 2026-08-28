import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

import { build } from 'esbuild'
import type { BuildResult, Metafile, Plugin } from 'esbuild'
import { compile } from 'svelte/compiler'

export type BundlePlatform = 'browser' | 'node'

export interface BundleCase {
  readonly name: string
  readonly subpath: string
  readonly platform: BundlePlatform
  readonly fixture?: string
}

export interface BundleMeasurement {
  readonly bytes: number
  readonly gzipBytes: number
}

export interface BundleBudget {
  readonly maxBytes: number
  readonly maxGzipBytes: number
  readonly maxDeltaBytes?: number
  readonly maxDeltaGzipBytes?: number
}

export interface BundleReport {
  readonly generatedAt: string
  readonly measurements: Record<string, BundleMeasurement>
}

export interface PackageManifest {
  readonly exports: Record<string, unknown>
  readonly peerDependencies?: Record<string, string>
  readonly bin?: Record<string, string> | string
}

export const BUNDLE_CASES: readonly BundleCase[] = [
  { name: 'core', subpath: '.', platform: 'browser', fixture: 'core.ts' },
  {
    name: 'react-factory',
    subpath: './react',
    platform: 'browser',
    fixture: 'react-factory.ts',
  },
  {
    name: 'react-check',
    subpath: './react',
    platform: 'browser',
    fixture: 'react-check.ts',
  },
  { name: 'vue', subpath: './vue', platform: 'browser', fixture: 'vue.ts' },
  {
    name: 'solid',
    subpath: './solid',
    platform: 'browser',
    fixture: 'solid.ts',
  },
  {
    name: 'svelte',
    subpath: './svelte',
    platform: 'browser',
    fixture: 'svelte.ts',
  },
  { name: 'trpc', subpath: './trpc', platform: 'node', fixture: 'trpc.ts' },
  { name: 'orpc', subpath: './orpc', platform: 'node', fixture: 'orpc.ts' },
  {
    name: 'express',
    subpath: './express',
    platform: 'node',
    fixture: 'express.ts',
  },
  { name: 'hono', subpath: './hono', platform: 'node', fixture: 'hono.ts' },
  { name: 'node', subpath: './node', platform: 'node', fixture: 'node.ts' },
  {
    name: 'server',
    subpath: './server',
    platform: 'node',
    fixture: 'server.ts',
  },
  { name: 'astro', subpath: './astro', platform: 'node', fixture: 'astro.ts' },
  {
    name: 'elysia',
    subpath: './elysia',
    platform: 'node',
    fixture: 'elysia.ts',
  },
  {
    name: 'fastify',
    subpath: './fastify',
    platform: 'node',
    fixture: 'fastify.ts',
  },
  {
    name: 'drizzle',
    subpath: './drizzle',
    platform: 'node',
    fixture: 'drizzle.ts',
  },
  {
    name: 'standard-schema',
    subpath: './standard-schema',
    platform: 'node',
    fixture: 'standard-schema.ts',
  },
  {
    name: 'effect',
    subpath: './effect',
    platform: 'node',
    fixture: 'effect.ts',
  },
  { name: 'next', subpath: './next', platform: 'node', fixture: 'next.ts' },
  {
    name: 'next-config',
    subpath: './next/config',
    platform: 'node',
    fixture: 'next-config.ts',
  },
  { name: 'nuxt', subpath: './nuxt', platform: 'node', fixture: 'nuxt.ts' },
  {
    name: 'tanstack-start',
    subpath: './tanstack-start',
    platform: 'node',
    fixture: 'tanstack-start.ts',
  },
  { name: 'nest', subpath: './nest', platform: 'node', fixture: 'nest.ts' },
  {
    name: 'react-router',
    subpath: './react-router',
    platform: 'node',
    fixture: 'react-router.ts',
  },
  {
    name: 'extractor',
    subpath: './extractor',
    platform: 'node',
    fixture: 'extractor.ts',
  },
  {
    name: 'extractor-cli',
    subpath: 'bin:permix',
    platform: 'node',
  },
] as const

export const FORBIDDEN_BROWSER_PACKAGES = [
  'chokidar',
  'oxc-parser',
  'tinyglobby',
] as const

const packageRoot = path.resolve(import.meta.dirname, '..')
const entriesDirectory = path.join(packageRoot, 'benchmarks', 'entries')
const outputDirectory = path.join(packageRoot, 'benchmarks', '.bundle-size')
const budgetsPath = path.join(
  packageRoot,
  'benchmarks',
  'bundle-size-budgets.json'
)
const baselinePath = path.join(
  packageRoot,
  'benchmarks',
  'bundle-size-baseline.json'
)
const packagePath = path.join(packageRoot, 'package.json')
const sveltePlugin: Plugin = {
  name: 'svelte',
  setup(buildContext) {
    buildContext.onLoad({ filter: /\.svelte$/ }, async ({ path: filePath }) => {
      const source = await readFile(filePath, 'utf-8')
      const result = compile(source, {
        dev: false,
        filename: filePath,
        generate: 'client',
      })
      return {
        contents: result.js.code,
        loader: 'js',
        resolveDir: path.dirname(filePath),
      }
    })
  },
}

function binEntries(manifest: PackageManifest): string[] {
  if (typeof manifest.bin === 'string') {
    return ['bin:permix']
  }
  return Object.keys(manifest.bin ?? {}).map((name) => `bin:${name}`)
}

function binTarget(
  manifest: PackageManifest,
  subpath: string
): string | undefined {
  const name = subpath.slice('bin:'.length)
  if (typeof manifest.bin === 'string') {
    return name === 'permix' ? manifest.bin : undefined
  }
  return manifest.bin?.[name]
}

function isByteCount(value: unknown): value is number {
  return Number.isFinite(value) && Number.isInteger(value) && Number(value) >= 0
}

export function validateBudget(
  name: string,
  budget: Partial<BundleBudget>,
  requireDeltas = false
): string[] {
  const errors: string[] = []
  for (const field of ['maxBytes', 'maxGzipBytes'] as const) {
    if (!isByteCount(budget[field])) {
      errors.push(`Invalid bundle-size threshold "${name}.${field}"`)
    }
  }
  for (const field of ['maxDeltaBytes', 'maxDeltaGzipBytes'] as const) {
    if (requireDeltas && budget[field] === undefined) {
      errors.push(`Missing bundle-size threshold "${name}.${field}"`)
    } else if (budget[field] !== undefined && !isByteCount(budget[field])) {
      errors.push(`Invalid bundle-size threshold "${name}.${field}"`)
    }
  }
  return errors
}

function validateMeasurement(
  name: string,
  measurement: Partial<BundleMeasurement>,
  source: 'baseline' | 'measurement'
): string[] {
  const errors: string[] = []
  for (const field of ['bytes', 'gzipBytes'] as const) {
    if (!isByteCount(measurement[field])) {
      errors.push(`Invalid bundle-size ${source} "${name}.${field}"`)
    }
  }
  return errors
}

export function validateConfiguration(
  manifest: PackageManifest,
  cases: readonly BundleCase[],
  budgets: Record<string, BundleBudget>,
  availableFixtures?: readonly string[]
): string[] {
  const errors: string[] = []
  const exportSubpaths = Object.keys(manifest.exports).filter(
    (subpath) => subpath !== './package.json'
  )
  const expectedSubpaths = new Set([...exportSubpaths, ...binEntries(manifest)])
  const coveredSubpaths = new Set(cases.map((bundleCase) => bundleCase.subpath))
  const caseNames = new Set<string>()
  const fixtures = new Set<string>()
  const availableFixtureSet = availableFixtures
    ? new Set(availableFixtures)
    : undefined

  for (const subpath of expectedSubpaths) {
    if (!coveredSubpaths.has(subpath)) {
      errors.push(`Missing bundle-size fixture for package export "${subpath}"`)
    }
  }

  for (const bundleCase of cases) {
    if (!expectedSubpaths.has(bundleCase.subpath)) {
      errors.push(
        `Bundle-size case "${bundleCase.name}" covers unknown export "${bundleCase.subpath}"`
      )
    }
    if (caseNames.has(bundleCase.name)) {
      errors.push(`Duplicate bundle-size case name "${bundleCase.name}"`)
    }
    const budget = budgets[bundleCase.name]
    if (budget === undefined) {
      errors.push(`Missing bundle-size threshold for "${bundleCase.name}"`)
    } else {
      errors.push(...validateBudget(bundleCase.name, budget))
    }
    if (bundleCase.subpath.startsWith('bin:')) {
      if (!binTarget(manifest, bundleCase.subpath)) {
        errors.push(`Missing package bin target for "${bundleCase.subpath}"`)
      }
    } else if (bundleCase.fixture) {
      if (fixtures.has(bundleCase.fixture)) {
        errors.push(`Duplicate bundle-size fixture "${bundleCase.fixture}"`)
      }
      if (availableFixtureSet && !availableFixtureSet.has(bundleCase.fixture)) {
        errors.push(`Missing bundle-size fixture file "${bundleCase.fixture}"`)
      }
      fixtures.add(bundleCase.fixture)
    } else {
      errors.push(`Missing bundle-size fixture for "${bundleCase.name}"`)
    }
    caseNames.add(bundleCase.name)
  }

  for (const budgetName of Object.keys(budgets)) {
    if (!caseNames.has(budgetName)) {
      errors.push(`Bundle-size threshold has no case: "${budgetName}"`)
    }
  }

  return errors
}

function packageFromInput(input: string): string | undefined {
  const normalized = input.replaceAll('\\', '/')
  const marker = 'node_modules/'
  const markerIndex = normalized.lastIndexOf(marker)
  const packagePath =
    markerIndex === -1
      ? normalized
      : normalized.slice(markerIndex + marker.length)
  const parts = packagePath.split('/')
  const first = parts[0]
  if (!first) {
    return undefined
  }
  return first.startsWith('@') && parts[1] ? `${first}/${parts[1]}` : first
}

export function findForbiddenBrowserLeaks(
  output: string,
  metafile: Metafile,
  forbidden: readonly string[] = FORBIDDEN_BROWSER_PACKAGES
): string[] {
  const leaks = new Set<string>()

  for (const input of Object.keys(metafile.inputs)) {
    const packageName = packageFromInput(input)
    if (packageName && forbidden.includes(packageName)) {
      leaks.add(`${packageName} (metafile input: ${input})`)
    }
  }

  for (const packageName of forbidden) {
    if (output.includes(packageName)) {
      leaks.add(`${packageName} (bundled output)`)
    }
  }

  return [...leaks].toSorted()
}

export function compareMeasurements(
  measurements: Record<string, BundleMeasurement>,
  budgets: Record<string, BundleBudget>,
  baseline?: Record<string, BundleMeasurement> | null
): string[] {
  const errors: string[] = []
  const compareBaseline = baseline ?? undefined
  if (baseline === null) {
    errors.push('Invalid bundle-size baseline report')
  }

  for (const [name, measurement] of Object.entries(measurements)) {
    const budget = budgets[name]
    if (!budget) {
      errors.push(`Missing bundle-size threshold for "${name}"`)
      continue
    }
    const schemaErrors = [
      ...validateBudget(name, budget, baseline !== undefined),
      ...validateMeasurement(name, measurement, 'measurement'),
    ]
    if (schemaErrors.length > 0) {
      errors.push(...schemaErrors)
      continue
    }

    if (measurement.bytes > budget.maxBytes) {
      errors.push(
        `${name}: ${measurement.bytes} bytes exceeds maxBytes ${budget.maxBytes}`
      )
    }
    if (measurement.gzipBytes > budget.maxGzipBytes) {
      errors.push(
        `${name}: ${measurement.gzipBytes} gzip bytes exceeds maxGzipBytes ${budget.maxGzipBytes}`
      )
    }

    if (!compareBaseline) {
      continue
    }
    const previous = compareBaseline[name]
    if (!previous) {
      errors.push(`Missing baseline measurement for "${name}"`)
      continue
    }
    const baselineErrors = validateMeasurement(name, previous, 'baseline')
    if (baselineErrors.length > 0) {
      errors.push(...baselineErrors)
      continue
    }

    const deltaBytes = measurement.bytes - previous.bytes
    const deltaGzipBytes = measurement.gzipBytes - previous.gzipBytes
    if (
      budget.maxDeltaBytes !== undefined &&
      deltaBytes > budget.maxDeltaBytes
    ) {
      errors.push(
        `${name}: +${deltaBytes} bytes exceeds maxDeltaBytes ${budget.maxDeltaBytes}`
      )
    }
    if (
      budget.maxDeltaGzipBytes !== undefined &&
      deltaGzipBytes > budget.maxDeltaGzipBytes
    ) {
      errors.push(
        `${name}: +${deltaGzipBytes} gzip bytes exceeds maxDeltaGzipBytes ${budget.maxDeltaGzipBytes}`
      )
    }
  }

  for (const name of Object.keys(budgets)) {
    if (measurements[name] === undefined) {
      errors.push(`Missing bundle-size measurement for "${name}"`)
    }
  }

  return errors
}

function externalPackages(manifest: PackageManifest): string[] {
  return Object.keys(manifest.peerDependencies ?? {}).flatMap((packageName) => [
    packageName,
    `${packageName}/*`,
  ])
}

export function resolveBundleEntryPoint(
  bundleCase: BundleCase,
  manifest: PackageManifest
): string {
  if (bundleCase.subpath.startsWith('bin:')) {
    const target = binTarget(manifest, bundleCase.subpath)
    if (!target) {
      throw new Error(`Missing package bin target for "${bundleCase.subpath}"`)
    }
    return path.resolve(packageRoot, target)
  }
  if (!bundleCase.fixture) {
    throw new Error(`Missing bundle-size fixture for "${bundleCase.name}"`)
  }
  return path.join(entriesDirectory, bundleCase.fixture)
}

async function buildBundleCase(
  bundleCase: BundleCase,
  external: string[],
  manifest: PackageManifest
): Promise<{ measurement: BundleMeasurement; leaks: string[] }> {
  const outfile = path.join(outputDirectory, `${bundleCase.name}.mjs`)
  const result: BuildResult<{ metafile: true; write: false }> = await build({
    entryPoints: [resolveBundleEntryPoint(bundleCase, manifest)],
    outfile,
    bundle: true,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    external: [...external, 'astro:*', 'virtual:*'],
    format: 'esm',
    legalComments: 'none',
    metafile: true,
    minify: true,
    platform: bundleCase.platform,
    plugins: [sveltePlugin],
    target: bundleCase.platform === 'browser' ? ['es2022'] : ['node22'],
    treeShaking: true,
    write: false,
  })
  const outputFile = result.outputFiles[0]
  if (!outputFile) {
    throw new Error(`esbuild produced no output for "${bundleCase.name}"`)
  }

  await writeFile(outfile, outputFile.contents)
  const output = outputFile.text
  const leaks =
    bundleCase.platform === 'browser'
      ? findForbiddenBrowserLeaks(output, result.metafile)
      : []

  return {
    measurement: {
      bytes: outputFile.contents.byteLength,
      gzipBytes: gzipSync(outputFile.contents, { level: 9 }).byteLength,
    },
    leaks,
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf-8')) as T
}

export function readBaselineMeasurements(
  report: unknown
): Record<string, BundleMeasurement> {
  if (
    typeof report !== 'object' ||
    report === null ||
    !('measurements' in report) ||
    typeof report.measurements !== 'object' ||
    report.measurements === null ||
    Array.isArray(report.measurements)
  ) {
    throw new Error('Invalid bundle-size baseline report')
  }
  return report.measurements as Record<string, BundleMeasurement>
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} kB`
}

function printHumanReport(
  measurements: Record<string, BundleMeasurement>
): void {
  const nameWidth = Math.max(
    ...Object.keys(measurements).map((name) => name.length)
  )
  console.log(
    `${'Fixture'.padEnd(nameWidth)}  ${'Minified'.padStart(10)}  ${'Gzip'.padStart(10)}`
  )
  for (const [name, measurement] of Object.entries(measurements)) {
    console.log(
      `${name.padEnd(nameWidth)}  ${formatBytes(measurement.bytes).padStart(10)}  ${formatBytes(measurement.gzipBytes).padStart(10)}`
    )
  }
}

interface CliOptions {
  readonly json: boolean
  readonly comparePath?: string
  readonly updateBaseline: boolean
}

function parseArguments(args: readonly string[]): CliOptions {
  let comparePath: string | undefined
  let json = false
  let updateBaseline = false

  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === '--json') {
      json = true
      continue
    }
    if (argument === '--update-baseline') {
      updateBaseline = true
      continue
    }
    if (argument === '--compare') {
      comparePath = args[++index]
      if (!comparePath) {
        throw new Error('--compare requires a path')
      }
      continue
    }
    throw new Error(`Unknown argument: ${argument}`)
  }

  if (updateBaseline && comparePath) {
    throw new Error('--compare and --update-baseline cannot be used together')
  }

  return { json, comparePath, updateBaseline }
}

export async function runBundleSize(
  args = process.argv.slice(2)
): Promise<void> {
  const options = parseArguments(args)
  const [manifest, budgets, availableFixtures] = await Promise.all([
    readJson<PackageManifest>(packagePath),
    readJson<Record<string, BundleBudget>>(budgetsPath),
    readdir(entriesDirectory),
  ])
  const configurationErrors = validateConfiguration(
    manifest,
    BUNDLE_CASES,
    budgets,
    availableFixtures
  )
  if (configurationErrors.length > 0) {
    throw new Error(configurationErrors.join('\n'))
  }

  await mkdir(outputDirectory, { recursive: true })
  const measurements: Record<string, BundleMeasurement> = {}
  const leakErrors: string[] = []
  const external = externalPackages(manifest)
  const bundledCases = await Promise.all(
    BUNDLE_CASES.map(async (bundleCase) => ({
      bundleCase,
      result: await buildBundleCase(bundleCase, external, manifest),
    }))
  )

  for (const { bundleCase, result } of bundledCases) {
    measurements[bundleCase.name] = result.measurement
    for (const leak of result.leaks) {
      leakErrors.push(
        `${bundleCase.name}: forbidden browser dependency ${leak}`
      )
    }
  }

  const report: BundleReport = {
    generatedAt: new Date().toISOString(),
    measurements,
  }
  let baseline: Record<string, BundleMeasurement> | undefined
  if (options.comparePath) {
    const baselineReport = await readJson<unknown>(
      path.resolve(packageRoot, options.comparePath)
    )
    baseline = readBaselineMeasurements(baselineReport)
  }
  const budgetErrors = compareMeasurements(measurements, budgets, baseline)
  const errors = [...leakErrors, ...budgetErrors]

  if (options.updateBaseline && errors.length === 0) {
    await writeFile(baselinePath, `${JSON.stringify(report, null, 2)}\n`)
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHumanReport(measurements)
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isMain) {
  runBundleSize().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
