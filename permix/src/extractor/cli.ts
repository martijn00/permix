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
  --force                  Rescan every file instead of using the parse cache
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

interface ParsedFlags {
  include: string[]
  exclude: string[]
  cwd?: string
  moduleOutput?: string
  catalogOutput?: string
  check: boolean
  help: boolean
  watch: boolean
  force: boolean
}

function applyFlag(
  argument: string,
  args: readonly string[],
  index: number,
  flags: ParsedFlags
): number {
  switch (argument) {
    case '--cwd': {
      flags.cwd = readValue(args, index, argument)
      return index + 1
    }
    case '--include': {
      flags.include.push(readValue(args, index, argument))
      return index + 1
    }
    case '--exclude': {
      flags.exclude.push(readValue(args, index, argument))
      return index + 1
    }
    case '--module-output': {
      flags.moduleOutput = readValue(args, index, argument)
      return index + 1
    }
    case '--catalog-output': {
      flags.catalogOutput = readValue(args, index, argument)
      return index + 1
    }
    case '--check': {
      flags.check = true
      return index
    }
    case '--watch': {
      flags.watch = true
      return index
    }
    case '--force': {
      flags.force = true
      return index
    }
    case '--help':
    case '-h': {
      flags.help = true
      return index
    }
    default: {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }
}

export function parseCliOptions(arguments_: readonly string[]): CliOptions {
  const args = arguments_[0] === 'extract' ? arguments_.slice(1) : arguments_
  const flags: ParsedFlags = {
    include: [],
    exclude: [],
    check: false,
    help: false,
    watch: false,
    force: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === undefined) {
      break
    }
    index = applyFlag(argument, args, index, flags)
  }

  if (flags.check && flags.watch) {
    throw new Error('--check and --watch cannot be used together.')
  }

  return {
    check: flags.check,
    help: flags.help,
    watch: flags.watch,
    ...(flags.cwd === undefined ? {} : { cwd: flags.cwd }),
    ...(flags.include.length === 0 ? {} : { include: flags.include }),
    ...(flags.exclude.length === 0 ? {} : { exclude: flags.exclude }),
    ...(flags.moduleOutput === undefined
      ? {}
      : { moduleOutput: flags.moduleOutput }),
    ...(flags.catalogOutput === undefined
      ? {}
      : { catalogOutput: flags.catalogOutput }),
    ...(flags.force ? { force: true } : {}),
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
    ...(options.force === true ? { force: true } : {}),
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

const executable = process.argv[1]
if (
  executable !== undefined &&
  pathToFileURL(path.resolve(executable)).href === import.meta.url
) {
  process.exitCode = await runCli(process.argv.slice(2))
}
