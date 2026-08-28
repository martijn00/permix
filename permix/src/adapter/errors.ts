import { PermixNotReadyError, PermixRuleNotDefinedError } from '../core/errors'
import type { StandardSchemaV1Issue } from '../core/standard-schema'
import { PermixValidationError } from '../standard-schema/errors'

export type AdapterErrorCode =
  | 'unauthenticated'
  | 'invalid-request'
  | 'validation-failure'
  | 'forbidden'
  | 'internal-error'

export interface AdapterValidationIssue {
  readonly message: string
  readonly path?: readonly string[]
}

export interface AdapterErrorDto {
  readonly code: AdapterErrorCode
  readonly message: string
  readonly issues?: readonly AdapterValidationIssue[]
}

export class AdapterError extends Error {
  readonly code: AdapterErrorCode
  readonly issues?: readonly AdapterValidationIssue[]

  constructor(
    code: AdapterErrorCode,
    message: string,
    issues?: readonly AdapterValidationIssue[]
  ) {
    super(message)
    this.name = 'AdapterError'
    this.code = code
    if (issues !== undefined) {
      this.issues = issues
    }
  }
}

function serializeIssue(issue: StandardSchemaV1Issue): AdapterValidationIssue {
  if (issue.path === undefined) {
    return { message: issue.message }
  }

  return {
    message: issue.message,
    path: issue.path.map((segment) =>
      String(typeof segment === 'object' ? segment.key : segment)
    ),
  }
}

/**
 * Converts adapter and known core errors into a small JSON-safe DTO.
 * Unknown errors deliberately do not expose their original message.
 */
export function serializeAdapterError(error: unknown): AdapterErrorDto {
  if (error instanceof AdapterError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.issues === undefined ? {} : { issues: error.issues }),
    }
  }

  if (error instanceof PermixValidationError) {
    return {
      code: 'validation-failure',
      message: error.message,
      issues: error.issues.map(serializeIssue),
    }
  }

  if (
    error instanceof PermixRuleNotDefinedError ||
    error instanceof PermixNotReadyError
  ) {
    return {
      code: 'invalid-request',
      message: error.message,
    }
  }

  return {
    code: 'internal-error',
    message: 'Internal error.',
  }
}
