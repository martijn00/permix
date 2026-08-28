import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  BUNDLE_CASES,
  compareMeasurements,
  findForbiddenBrowserLeaks,
  readBaselineMeasurements,
  resolveBundleEntryPoint,
  validateConfiguration,
} from './bundle-size'
import type { BundleBudget, BundleCase, PackageManifest } from './bundle-size'

const packagePath = path.resolve(process.cwd(), 'package.json')
const budgetsPath = path.resolve(
  process.cwd(),
  'benchmarks/bundle-size-budgets.json'
)
const fixturesPath = path.resolve(process.cwd(), 'benchmarks/entries')

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf-8')) as T
}

describe(compareMeasurements, () => {
  const budgets = {
    small: {
      maxBytes: 120,
      maxGzipBytes: 60,
      maxDeltaBytes: 10,
      maxDeltaGzipBytes: 5,
    },
  }

  it('passes measurements within hard and delta budgets', () => {
    expect(
      compareMeasurements({ small: { bytes: 105, gzipBytes: 52 } }, budgets, {
        small: { bytes: 100, gzipBytes: 50 },
      })
    ).toStrictEqual([])
  })

  it('reports hard and baseline delta regressions', () => {
    expect(
      compareMeasurements({ small: { bytes: 130, gzipBytes: 70 } }, budgets, {
        small: { bytes: 100, gzipBytes: 50 },
      })
    ).toStrictEqual([
      'small: 130 bytes exceeds maxBytes 120',
      'small: 70 gzip bytes exceeds maxGzipBytes 60',
      'small: +30 bytes exceeds maxDeltaBytes 10',
      'small: +20 gzip bytes exceeds maxDeltaGzipBytes 5',
    ])
  })

  it('reports missing thresholds and measurements', () => {
    expect(
      compareMeasurements({ unbudgeted: { bytes: 1, gzipBytes: 1 } }, budgets)
    ).toStrictEqual([
      'Missing bundle-size threshold for "unbudgeted"',
      'Missing bundle-size measurement for "small"',
    ])
  })

  it('rejects malformed measurements and baselines', () => {
    expect(
      compareMeasurements(
        {
          small: { bytes: 100, gzipBytes: Number.NaN },
        },
        budgets
      )
    ).toContain('Invalid bundle-size measurement "small.gzipBytes"')

    expect(
      compareMeasurements({ small: { bytes: 100, gzipBytes: 50 } }, budgets, {
        small: { bytes: 100, gzipBytes: Number.NaN },
      })
    ).toContain('Invalid bundle-size baseline "small.gzipBytes"')
  })

  it('requires delta thresholds when comparing to a baseline', () => {
    expect(
      compareMeasurements(
        { small: { bytes: 100, gzipBytes: 50 } },
        { small: { maxBytes: 120, maxGzipBytes: 60 } },
        { small: { bytes: 100, gzipBytes: 50 } }
      )
    ).toStrictEqual([
      'Missing bundle-size threshold "small.maxDeltaBytes"',
      'Missing bundle-size threshold "small.maxDeltaGzipBytes"',
    ])
  })
})

describe(validateConfiguration, () => {
  it('covers every current package export, bin, fixture, and threshold', async () => {
    const [manifest, budgets, fixtures] = await Promise.all([
      readJson<PackageManifest>(packagePath),
      readJson<Record<string, BundleBudget>>(budgetsPath),
      readdir(fixturesPath),
    ])

    expect(
      validateConfiguration(manifest, BUNDLE_CASES, budgets, fixtures)
    ).toStrictEqual([])
  })

  it('reports an uncovered package export', () => {
    const bundleCase: BundleCase = {
      name: 'core',
      subpath: '.',
      platform: 'browser',
      fixture: 'core.ts',
    }
    const manifest: PackageManifest = {
      exports: { '.': {}, './new-adapter': {} },
    }
    const budgets = {
      core: { maxBytes: 1, maxGzipBytes: 1 },
    }

    expect(validateConfiguration(manifest, [bundleCase], budgets)).toContain(
      'Missing bundle-size fixture for package export "./new-adapter"'
    )
  })

  it('reports missing thresholds and fixture files', () => {
    const bundleCase: BundleCase = {
      name: 'core',
      subpath: '.',
      platform: 'browser',
      fixture: 'core.ts',
    }
    const manifest: PackageManifest = { exports: { '.': {} } }

    expect(validateConfiguration(manifest, [bundleCase], {}, [])).toStrictEqual(
      [
        'Missing bundle-size threshold for "core"',
        'Missing bundle-size fixture file "core.ts"',
      ]
    )
  })

  it('rejects malformed hard and delta thresholds', () => {
    const bundleCase: BundleCase = {
      name: 'core',
      subpath: '.',
      platform: 'browser',
      fixture: 'core.ts',
    }
    const manifest: PackageManifest = { exports: { '.': {} } }
    const malformedBudget = {
      maxBytes: 1,
      maxDeltaGzipBytes: -1,
    } as BundleBudget

    expect(
      validateConfiguration(manifest, [bundleCase], { core: malformedBudget })
    ).toStrictEqual([
      'Invalid bundle-size threshold "core.maxGzipBytes"',
      'Invalid bundle-size threshold "core.maxDeltaGzipBytes"',
    ])
  })
})

describe(resolveBundleEntryPoint, () => {
  it('reads the CLI entry point from the package manifest', () => {
    const cliCase: BundleCase = {
      name: 'extractor-cli',
      subpath: 'bin:permix',
      platform: 'node',
    }

    expect(
      resolveBundleEntryPoint(cliCase, {
        exports: {},
        bin: { permix: './dist/custom-cli.mjs' },
      })
    ).toBe(path.resolve(process.cwd(), 'dist/custom-cli.mjs'))
  })
})

describe(readBaselineMeasurements, () => {
  it('rejects a report without a measurements object', () => {
    expect(() => readBaselineMeasurements({})).toThrow(
      'Invalid bundle-size baseline report'
    )
    expect(() => readBaselineMeasurements({ measurements: null })).toThrow(
      'Invalid bundle-size baseline report'
    )
  })
})

describe(findForbiddenBrowserLeaks, () => {
  it('detects forbidden packages in metafile inputs and bundled output', () => {
    const metafile = {
      inputs: {
        'node_modules/chokidar/index.js': { bytes: 1, imports: [] },
        'src/index.ts': { bytes: 1, imports: [] },
      },
      outputs: {},
    }

    expect(
      findForbiddenBrowserLeaks('const parser = "oxc-parser"', metafile)
    ).toStrictEqual([
      'chokidar (metafile input: node_modules/chokidar/index.js)',
      'oxc-parser (bundled output)',
    ])
  })

  it('passes a clean browser graph', () => {
    const metafile = {
      inputs: {
        'node_modules/react/index.js': { bytes: 1, imports: [] },
      },
      outputs: {},
    }

    expect(
      findForbiddenBrowserLeaks('export const value = 1', metafile)
    ).toStrictEqual([])
  })
})
