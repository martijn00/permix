import type { CheckArgs, CheckerFn } from '../core'
import type { Definition } from '../core/definitions'
import type { StandardSchemaV1 } from '../core/standard-schema'
import { PermixAsyncValidationError, PermixValidationError } from './errors'

export type ValidateMode = 'deny' | 'throw'

const DENY = Symbol('deny')
const SKIP = Symbol('skip')

function isSpecialPath(path: string): boolean {
  const last = path.split('.').pop()
  return last === '~any' || last === '~all'
}

function entityKey(path: string): string {
  const dot = path.indexOf('.')
  return dot === -1 ? path : path.slice(0, dot)
}

/**
 * Run a Standard Schema `validate` against `check()` data.
 *
 * @returns `DENY` when invalid and mode is `'deny'`, `SKIP` when there is
 * nothing to validate, or the parsed output value.
 */
export function prepareCheckData(
  schemas: Map<string, StandardSchemaV1>,
  mode: ValidateMode,
  path: string,
  data: unknown
): typeof DENY | typeof SKIP | unknown {
  if (isSpecialPath(path) || data === undefined) {
    return SKIP
  }

  const schema = schemas.get(entityKey(path))
  if (!schema) {
    return SKIP
  }

  const result = schema['~standard'].validate(data)
  if (result instanceof Promise) {
    throw new PermixAsyncValidationError(path)
  }

  if (result.issues) {
    if (mode === 'throw') {
      throw new PermixValidationError(path, result.issues)
    }
    return DENY
  }

  return result.value
}

export function checkWithValidation<D extends Definition>(
  check: (...args: CheckArgs<D>) => boolean,
  schemas: Map<string, StandardSchemaV1>,
  mode: ValidateMode,
  args: CheckArgs<D>
): boolean {
  const first = args[0]

  if (typeof first === 'function') {
    return check((c: CheckerFn<D>) =>
      first((path, ...data) => {
        const prepared = prepareCheckData(schemas, mode, path, data[0])
        if (prepared === DENY) {
          return false
        }
        if (prepared === SKIP) {
          return c(path, ...data)
        }
        return (c as (nextPath: string, nextData?: unknown) => boolean)(
          path,
          prepared
        )
      })
    )
  }

  const prepared = prepareCheckData(schemas, mode, first, args[1])
  if (prepared === DENY) {
    return false
  }
  if (prepared === SKIP) {
    return check(...args)
  }
  return check(...([first, prepared] as unknown as CheckArgs<D>))
}
