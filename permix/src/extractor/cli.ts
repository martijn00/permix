#!/usr/bin/env node

import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { PermissionExtractionError } from './error'
import { checkPermissions, generatePermissions } from './generate'
import type { GeneratePermissionsOptions } from './types'
import { watchPermissions } from './watch'

interface CliOptions extends GeneratePermissionsOptions {
  readonly check: boolean
  readonly help: boolean
  readonly watch: boolean
}

const HELP = `Usage: permix extract [options]

Generate a typed permission module and versioned JSON catalog.

Options:
  --cwd <path>             Source root (default: current directory)
  --include <glob>         Include glob; may be repeated
  --exclude <glob>         Exclude glob; may be repeated
  --module-output <path>   Generated TypeScript module
  --catalog-output <path>  Generated JSON catalog
  --check                  Exit non-zero when artifacts are stale
  --watch                  Regenerate after source changes
  --help                   Show this help
`

function readValue(
  arguments_: readonly string[],
  index: number,
  flag: string
): string {
  const value = arguments_[index + 1]
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`)
  }
  return value
}

export function parseCliOptions(arguments_: readonly string[]): CliOptions {
  const args = arguments_[0] === 'extract' ? arguments_.slice(1) : arguments_
  const include: string[] = []
  const exclude: string[] = []
  let cwd: string | undefined
  let moduleOutput: string | undefined
  let catalogOutput: string | undefined
  let check = false
  let help = false
  let watch = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--cwd') {
      cwd = readValue(args, index, argument)
      index += 1
    } else if (argument === '--include') {
      include.push(readValue(args, index, argument))
      index += 1
    } else if (argument === '--exclude') {
      exclude.push(readValue(args, index, argument))
      index += 1
    } else if (argument === '--module-output') {
      moduleOutput = readValue(args, index, argument)
      index += 1
    } else if (argument === '--catalog-output') {
      catalogOutput = readValue(args, index, argument)
      index += 1
    } else if (argument === '--check') {
      check = true
    } else if (argument === '--watch') {
      watch = true
    } else if (argument === '--help' || argument === '-h') {
      help = true
    } else {
      throw new Error(`Unknown argument: ${argument ?? ''}`)
    }
  }

  if (check && watch) {
    throw new Error('--check and --watch cannot be used together.')
  }

  return {
    check,
    help,
    watch,
    ...(cwd === undefined ? {} : { cwd }),
    ...(include.length === 0 ? {} : { include }),
    ...(exclude.length === 0 ? {} : { exclude }),
    ...(moduleOutput === undefined ? {} : { moduleOutput }),
    ...(catalogOutput === undefined ? {} : { catalogOutput }),
  }
}

function generationOptions(options: CliOptions): GeneratePermissionsOptions {
  return {
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    ...(options.include === undefined ? {} : { include: options.include }),
    ...(options.exclude === undefined ? {} : { exclude: options.exclude }),
    ...(options.moduleOutput === undefined
      ? {}
      : { moduleOutput: options.moduleOutput }),
    ...(options.catalogOutput === undefined
      ? {}
      : { catalogOutput: options.catalogOutput }),
  }
}

function displayFile(file: string, cwd: string): string {
  const relativePath = path.relative(cwd, file)
  return relativePath.length === 0 ? file : relativePath
}

function reportError(error: unknown): void {
  if (error instanceof PermissionExtractionError) {
    for (const diagnostic of error.diagnostics) {
      const location =
        diagnostic.line === undefined
          ? diagnostic.file
          : `${diagnostic.file}:${diagnostic.line}:${diagnostic.column ?? 1}`
      console.error(`${location} [${diagnostic.code}] ${diagnostic.message}`)
    }
    return
  }

  console.error(error instanceof Error ? error.message : String(error))
}

export async function runCli(arguments_: readonly string[]): Promise<number> {
  try {
    const options = parseCliOptions(arguments_)
    if (options.help) {
      console.log(HELP)
      return 0
    }

    const generateOptions = generationOptions(options)
    const cwd = path.resolve(options.cwd ?? process.cwd())

    if (options.check) {
      const result = await checkPermissions(generateOptions)
      if (!result.valid) {
        for (const file of result.stale) {
          console.error(`Stale permission artifact: ${displayFile(file, cwd)}`)
        }
        return 1
      }

      console.log(
        `Permission artifacts are current (${result.catalog.permissions.length} permissions).`
      )
      return 0
    }

    if (options.watch) {
      await watchPermissions(generateOptions, (event) => {
        if (event.type === 'error') {
          reportError(event.error)
        } else if (event.result.catalogChanged || event.result.moduleChanged) {
          console.log(
            `Generated ${event.result.catalog.permissions.length} permissions.`
          )
        }
      })
      console.log(`Watching ${cwd} for permission changes.`)
      return 0
    }

    const result = await generatePermissions(generateOptions)
    console.log(`Generated ${result.catalog.permissions.length} permissions.`)
    return 0
  } catch (error) {
    reportError(error)
    return 1
  }
}

/* v8 ignore start -- CLI process entry cannot run inside Vitest without exiting the worker */
const executable = process.argv[1]
if (
  executable !== undefined &&
  pathToFileURL(path.resolve(executable)).href === import.meta.url
) {
  process.exitCode = await runCli(process.argv.slice(2))
}
/* v8 ignore stop */
