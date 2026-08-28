import type {
  AdapterCheckRequest,
  AdapterDecision,
  AdapterErrorCode,
  AdapterErrorDto,
  AdapterPathCheckArgs,
  AdapterValidationIssue,
} from '../adapter'
import type { Definition, DehydratedState } from '../core'
import type {
  CreatePdpClientOptions,
  PdpBatchResult,
  PdpClient,
  PdpMetadata,
} from './types'

interface ErrorPayload {
  readonly error: AdapterErrorDto
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  return (
    isRecord(value) &&
    !('allowed' in value) &&
    isRecord(value.error) &&
    typeof value.error.code === 'string' &&
    typeof value.error.message === 'string'
  )
}

export class PdpClientError extends Error {
  readonly status: number
  readonly code: AdapterErrorCode
  readonly issues?: readonly AdapterValidationIssue[]

  constructor(status: number, error: AdapterErrorDto) {
    super(error.message)
    this.name = 'PdpClientError'
    this.status = status
    this.code = error.code
    if (error.issues !== undefined) {
      this.issues = error.issues
    }
  }
}

function bodyFromArgs<D extends Definition>(
  mode: 'caller' | 'service',
  subject: string | undefined,
  args: AdapterPathCheckArgs<D>
): Record<string, unknown> {
  const body: Record<string, unknown> = { mode, path: args[0] }
  if (subject !== undefined) {
    body.subject = subject
  }
  if (args.length > 1) {
    body.data = args[1]
  }
  return body
}

/**
 * Creates a browser-compatible client for the versioned PDP transport.
 */
export function createPdpClient<D extends Definition>(
  options: CreatePdpClientOptions = {}
): PdpClient<D> {
  const baseUrl = (options.baseUrl ?? '').replace(/\/+$/, '')
  const fetchImplementation = options.fetch ?? globalThis.fetch

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(await options.headers?.())
    if (init.body !== undefined) {
      headers.set('content-type', 'application/json')
    }
    const response = await fetchImplementation(`${baseUrl}${path}`, {
      ...init,
      headers,
    })

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new PdpClientError(response.status, {
        code: 'internal-error',
        message: 'PDP returned an invalid JSON response.',
      })
    }
    if (!response.ok || isErrorPayload(payload)) {
      const error = isErrorPayload(payload)
        ? payload.error
        : {
            code: 'internal-error' as const,
            message: 'PDP request failed.',
          }
      throw new PdpClientError(response.status, error)
    }
    return payload as T
  }

  async function post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async function check(
    mode: 'caller' | 'service',
    subject: string | undefined,
    args: AdapterPathCheckArgs<D>
  ): Promise<AdapterDecision> {
    return post('/v1/check', bodyFromArgs(mode, subject, args))
  }

  async function checkMany(
    mode: 'caller' | 'service',
    subject: string | undefined,
    checks: readonly AdapterCheckRequest<D>[]
  ): Promise<readonly PdpBatchResult[]> {
    const payload = await post<{ results: readonly PdpBatchResult[] }>(
      '/v1/check/batch',
      {
        mode,
        ...(subject === undefined ? {} : { subject }),
        checks,
      }
    )
    return payload.results
  }

  async function permissions(
    mode: 'caller' | 'service',
    subject?: string
  ): Promise<DehydratedState<D>> {
    const payload = await post<{ permissions: DehydratedState<D> }>(
      '/v1/permissions',
      {
        mode,
        ...(subject === undefined ? {} : { subject }),
      }
    )
    return payload.permissions
  }

  return {
    check: (...args) => check('caller', undefined, args),
    checkAs: (subject, ...args) => check('service', subject, args),
    checkMany: (checks) => checkMany('caller', undefined, checks),
    checkManyAs: (subject, checks) => checkMany('service', subject, checks),
    permissions: () => permissions('caller'),
    permissionsAs: (subject) => permissions('service', subject),
    health: () => request<{ readonly status: 'ok' }>('/v1/health'),
    metadata: () => request<PdpMetadata>('/v1/meta'),
  }
}
