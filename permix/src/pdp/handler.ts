import { AdapterError, createAdapter, serializeAdapterError } from '../adapter'
import type {
  AdapterCheckRequest,
  AdapterDecision,
  AdapterErrorDto,
} from '../adapter'
import type { CheckArgs, Definition } from '../core'
import { optionalPdpCatalog } from './catalog'
import {
  parseBatchRequest,
  parseCheckItem,
  parseCheckRequest,
  parsePermissionsRequest,
} from './transport'
import type {
  CreatePdpHandlerOptions,
  PdpAdapterInput,
  PdpBatchResult,
  PdpHandler,
} from './types'

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }
const ALLOWED: AdapterDecision = { allowed: true }
const FORBIDDEN: AdapterDecision = {
  allowed: false,
  error: { code: 'forbidden', message: 'Forbidden.' },
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

function checkArgs<D extends Definition>(
  check: AdapterCheckRequest<D>
): CheckArgs<D> {
  return 'data' in check
    ? ([check.path, check.data] as unknown as CheckArgs<D>)
    : ([check.path] as CheckArgs<D>)
}

function decision(allowed: boolean): AdapterDecision {
  return allowed ? ALLOWED : FORBIDDEN
}

/**
 * Creates a Fetch-standard PDP handler. Authentication and rule setup flow
 * through the shared adapter kernel, including its per-request instance.
 */
export function createPdpHandler<
  D extends Definition,
  Principal,
  ServicePrincipal,
>(
  options: CreatePdpHandlerOptions<D, Principal, ServicePrincipal>
): PdpHandler {
  const catalog = optionalPdpCatalog(options.catalog)
  const adapter = createAdapter<D, PdpAdapterInput, Principal>({
    ...(catalog === undefined ? {} : { catalog }),
    ...(options.createInstance === undefined
      ? {}
      : { createInstance: options.createInstance }),
    async authenticate(input) {
      if (input.mode === 'caller') {
        return options.authenticateCaller(input.request)
      }

      const service = await options.authenticateService(input.request)
      if (service === null) {
        return null
      }
      if (input.subject === undefined) {
        throw new AdapterError(
          'invalid-request',
          'Service mode requires a non-empty subject.'
        )
      }
      const principal = await options.resolveSubject({
        request: input.request,
        service,
        subject: input.subject,
      })
      if (principal === null) {
        throw new AdapterError(
          'invalid-request',
          'Subject could not be resolved.'
        )
      }
      return principal
    },
    resolveRules({ input, principal }) {
      return options.resolveRules({
        request: input.request,
        mode: input.mode,
        principal,
      })
    },
  })

  async function single(request: Request): Promise<Response> {
    const parsed = await parseCheckRequest<D>(request)
    const result = await adapter.check(parsed.input, ...checkArgs(parsed.check))
    return json(result)
  }

  async function batch(request: Request): Promise<Response> {
    const parsed = await parseBatchRequest(request)
    const { permix } = await adapter.resolve(parsed.input)
    const results: PdpBatchResult[] = parsed.checks.map((item) => {
      try {
        const check = parseCheckItem<D>(item)
        return decision(permix.check(...checkArgs(check)))
      } catch (error) {
        return { error: serializeAdapterError(error) }
      }
    })
    return json({ results })
  }

  async function permissions(request: Request): Promise<Response> {
    const input = await parsePermissionsRequest(request)
    return json({ permissions: await adapter.dehydrate(input) })
  }

  return async (request) => {
    try {
      const pathname = new URL(request.url).pathname
      if (request.method === 'GET' && pathname === '/v1/health') {
        return json({ status: 'ok' })
      }
      if (request.method === 'GET' && pathname === '/v1/meta') {
        return json({
          protocolVersion: 'v1',
          version: options.version ?? 'unknown',
          catalog: catalog ?? null,
        })
      }
      if (request.method !== 'POST') {
        throw new AdapterError(
          'invalid-request',
          'Unsupported PDP endpoint or method.'
        )
      }
      if (pathname === '/v1/check') {
        return await single(request)
      }
      if (pathname === '/v1/check/batch') {
        return await batch(request)
      }
      if (pathname === '/v1/permissions') {
        return await permissions(request)
      }
      throw new AdapterError(
        'invalid-request',
        'Unsupported PDP endpoint or method.'
      )
    } catch (error) {
      return errorResponse(error)
    }
  }
}
