import type {
  AdapterErrorCode,
  AdapterErrorDto,
  AdapterValidationIssue,
} from '../adapter'
import { AdapterError, serializeAdapterError } from '../adapter'
import type { Definition, DehydratedState, Permix } from '../core'
import { createPermix, hydrateRules } from '../core'
import type { MaybePromise } from '../utils'
import type { ClerkPermix } from './server'

const JSON_HEADERS = {
  'cache-control': 'private, no-store',
  'content-type': 'application/json; charset=utf-8',
}

interface ErrorPayload {
  readonly error: AdapterErrorDto
}

interface PermissionsPayload<D extends Definition> {
  readonly permissions: DehydratedState<D>
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  })
}

function statusFor(error: AdapterErrorDto): number {
  if (error.code === 'unauthenticated') {
    return 401
  }
  if (error.code === 'invalid-request' || error.code === 'validation-failure') {
    return 400
  }
  if (error.code === 'forbidden') {
    return 403
  }
  return 500
}

function errorResponse(error: unknown): Response {
  const serialized = serializeAdapterError(error)
  return json({ error: serialized }, statusFor(serialized))
}

/**
 * Creates a Fetch-standard endpoint that authenticates the request and returns
 * JSON-safe permissions. Mount it on any framework route.
 */
export function createClerkPermissionsHandler<D extends Definition>(
  integration: ClerkPermix<D>
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      if (request.method !== 'GET') {
        throw new AdapterError(
          'invalid-request',
          'Only GET is supported by the Clerk permissions handler.'
        )
      }
      return json({ permissions: await integration.dehydrate(request) })
    } catch (error) {
      return errorResponse(error)
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  return (
    isRecord(value) &&
    isRecord(value.error) &&
    typeof value.error.code === 'string' &&
    typeof value.error.message === 'string'
  )
}

function isPermissionsPayload<D extends Definition>(
  value: unknown
): value is PermissionsPayload<D> {
  return isRecord(value) && isRecord(value.permissions)
}

export class ClerkPermixClientError extends Error {
  readonly status: number
  readonly code: AdapterErrorCode
  readonly issues?: readonly AdapterValidationIssue[]

  constructor(status: number, error: AdapterErrorDto) {
    super(error.message)
    this.name = 'ClerkPermixClientError'
    this.status = status
    this.code = error.code
    if (error.issues !== undefined) {
      this.issues = error.issues
    }
  }
}

export interface ClerkTokenOptions {
  readonly organizationId?: string
}

export interface CreateClerkPermixClientOptions {
  readonly getToken: (
    options?: ClerkTokenOptions
  ) => MaybePromise<string | null>
  readonly organizationId?: string | (() => MaybePromise<string | undefined>)
  readonly endpoint?: string
  readonly fetch?: typeof globalThis.fetch
}

export interface ClerkPermixClient<D extends Definition> {
  getPermissions: () => Promise<DehydratedState<D>>
  /**
   * Returns a client-side Permix instance for UX rendering only. Server-side
   * authorization must independently authenticate and check each operation.
   */
  getPermix: () => Promise<Permix<D>>
}

async function resolveOrganizationId(
  source: CreateClerkPermixClientOptions['organizationId']
): Promise<string | undefined> {
  return typeof source === 'function' ? await source() : source
}

/**
 * Creates a browser-compatible helper that always obtains and sends an
 * explicit Clerk Bearer token. `organizationId` is forwarded to `getToken()`
 * so callers can request an organization-aware token.
 */
export function createClerkPermixClient<D extends Definition>(
  options: CreateClerkPermixClientOptions
): ClerkPermixClient<D> {
  const endpoint = options.endpoint ?? '/api/permix/clerk/permissions'
  const fetchImplementation = options.fetch ?? globalThis.fetch

  async function getPermissions(): Promise<DehydratedState<D>> {
    const organizationId = await resolveOrganizationId(options.organizationId)
    const token = await options.getToken(
      organizationId === undefined ? undefined : { organizationId }
    )
    if (token === null || token.length === 0) {
      throw new ClerkPermixClientError(401, {
        code: 'unauthenticated',
        message: 'Unauthenticated.',
      })
    }

    const response = await fetchImplementation(endpoint, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      headers: { authorization: `Bearer ${token}` },
    })

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new ClerkPermixClientError(response.status, {
        code: 'internal-error',
        message: 'Clerk permissions endpoint returned invalid JSON.',
      })
    }

    if (!response.ok || isErrorPayload(payload)) {
      throw new ClerkPermixClientError(
        response.status,
        isErrorPayload(payload)
          ? payload.error
          : {
              code: 'internal-error',
              message: 'Clerk permissions request failed.',
            }
      )
    }
    if (!isPermissionsPayload<D>(payload)) {
      throw new ClerkPermixClientError(response.status, {
        code: 'internal-error',
        message: 'Clerk permissions endpoint returned an invalid payload.',
      })
    }
    return payload.permissions
  }

  return {
    getPermissions,
    async getPermix() {
      const rules = hydrateRules(await getPermissions())
      return createPermix<D>(rules)
    },
  }
}
