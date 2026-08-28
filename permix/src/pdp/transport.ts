import type { AdapterCheckRequest } from '../adapter'
import { AdapterError } from '../adapter'
import type { Definition } from '../core'
import type { PdpAdapterInput, PdpMode } from './types'

interface ParsedCheck<D extends Definition> {
  readonly input: PdpAdapterInput
  readonly check: AdapterCheckRequest<D>
}

interface ParsedBatch {
  readonly input: PdpAdapterInput
  readonly checks: readonly unknown[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(message: string): AdapterError {
  return new AdapterError('invalid-request', message)
}

function assertKeys(
  value: Record<string, unknown>,
  allowed: readonly string[]
): void {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key))
  if (unknown !== undefined) {
    throw invalid(`Unknown request field "${unknown}".`)
  }
}

function parseMode(value: unknown): PdpMode {
  if (value !== 'caller' && value !== 'service') {
    throw invalid('Mode must be "caller" or "service".')
  }
  return value
}

function parseInput(
  request: Request,
  body: Record<string, unknown>
): PdpAdapterInput {
  const mode = parseMode(body.mode)
  if (mode === 'caller') {
    if ('subject' in body) {
      throw invalid('Caller mode must not specify a subject.')
    }
    return { request, mode }
  }

  if (typeof body.subject !== 'string' || body.subject.length === 0) {
    throw invalid('Service mode requires a non-empty subject.')
  }
  return { request, mode, subject: body.subject }
}

export async function parseJsonBody(
  request: Request
): Promise<Record<string, unknown>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw invalid('Request body must be valid JSON.')
  }
  if (!isRecord(body)) {
    throw invalid('Request body must be a JSON object.')
  }
  return body
}

export function parseCheckItem<D extends Definition>(
  value: unknown
): AdapterCheckRequest<D> {
  if (
    !isRecord(value) ||
    typeof value.path !== 'string' ||
    value.path.length === 0
  ) {
    throw invalid('A check request requires a non-empty path.')
  }
  assertKeys(value, ['path', 'data'])

  if ('data' in value) {
    return {
      path: value.path,
      data: value.data,
    } as AdapterCheckRequest<D>
  }
  return { path: value.path } as AdapterCheckRequest<D>
}

export async function parseCheckRequest<D extends Definition>(
  request: Request
): Promise<ParsedCheck<D>> {
  const body = await parseJsonBody(request)
  assertKeys(body, ['mode', 'subject', 'path', 'data'])
  return {
    input: parseInput(request, body),
    check: parseCheckItem<D>({
      path: body.path,
      ...('data' in body ? { data: body.data } : {}),
    }),
  }
}

export async function parseBatchRequest(
  request: Request
): Promise<ParsedBatch> {
  const body = await parseJsonBody(request)
  assertKeys(body, ['mode', 'subject', 'checks'])
  if (!Array.isArray(body.checks)) {
    throw invalid('Batch request requires a checks array.')
  }
  return {
    input: parseInput(request, body),
    checks: body.checks,
  }
}

export async function parsePermissionsRequest(
  request: Request
): Promise<PdpAdapterInput> {
  const body = await parseJsonBody(request)
  assertKeys(body, ['mode', 'subject'])
  return parseInput(request, body)
}
