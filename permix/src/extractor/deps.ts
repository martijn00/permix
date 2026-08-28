import type * as Chokidar from 'chokidar'
import type * as OxcParser from 'oxc-parser'
import type * as Tinyglobby from 'tinyglobby'

/**
 * Extractor-only packages are optional peers so a UI-only `permix` install
 * does not download native parser binaries. Dynamic import is required so
 * missing peers fail at CLI / `withPermix` time instead of at module load.
 */
const EXTRACTOR_INSTALL_HINT =
  'Install chokidar, oxc-parser, and tinyglobby (or reinstall permix with optional dependencies enabled) to use the Permix CLI or withPermix.'

function missingExtractorDependency(error: unknown): Error {
  return new Error(`[Permix]: ${EXTRACTOR_INSTALL_HINT}`, { cause: error })
}

export async function importOxcParser(): Promise<typeof OxcParser> {
  try {
    return await import('oxc-parser')
  } catch (error) {
    throw missingExtractorDependency(error)
  }
}

export async function importTinyglobby(): Promise<typeof Tinyglobby> {
  try {
    return await import('tinyglobby')
  } catch (error) {
    throw missingExtractorDependency(error)
  }
}

export async function importChokidar(): Promise<typeof Chokidar> {
  try {
    return await import('chokidar')
  } catch (error) {
    throw missingExtractorDependency(error)
  }
}
