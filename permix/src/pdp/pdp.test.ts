import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import type { AdapterCheckRequest } from '../adapter'
import type { Permix } from '../core'
import { createPermix } from '../core'
import {
  PdpClientError,
  createPdpClient,
  createPdpHandler,
  createPdpOpenApiDocument,
} from './index'

// A type alias preserves concrete keys under Definition's recursive constraint.
// oxlint-disable-next-line typescript/consistent-type-definitions
type TestDefinition = {
  projects: [
    'read',
    {
      name: 'update'
      type: { id: string; ownerId: string }
      required: true
    },
  ]
}

const catalog = {
  schemaVersion: 1,
  permissions: [
    {
      key: 'projects.read',
      title: 'Read projects',
      description: 'View project details.',
      references: [],
    },
    {
      key: 'projects.update',
      description: 'Change a project owned by the caller.',
      references: [],
    },
  ],
} as const

function createHandler(overrides: Record<string, unknown> = {}) {
  return createPdpHandler<TestDefinition, string, string>({
    version: '4.1.2',
    catalog,
    authenticateCaller(request) {
      return (
        request.headers.get('authorization')?.replace('Bearer ', '') ?? null
      )
    },
    authenticateService(request) {
      return request.headers.get('x-service-token') === 'trusted'
        ? 'service'
        : null
    },
    resolveSubject({ subject }) {
      return subject.startsWith('user-') ? subject : null
    },
    resolveRules({ principal, request }) {
      const tenant = request.headers.get('x-tenant')
      return {
        projects: {
          read: tenant !== 'blocked',
          update: ({ ownerId }) => ownerId === principal,
        },
      }
    },
    ...overrides,
  })
}

function jsonRequest(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  return new Request(`https://pdp.test${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

async function read(response: Response) {
  return {
    status: response.status,
    body: await response.json(),
  }
}

describe(createPdpHandler, () => {
  it('serves health and versioned metadata', async () => {
    const handler = createHandler()

    await expect(
      read(await handler(new Request('https://pdp.test/v1/health')))
    ).resolves.toStrictEqual({
      status: 200,
      body: { status: 'ok' },
    })
    await expect(
      read(await handler(new Request('https://pdp.test/v1/meta')))
    ).resolves.toMatchObject({
      status: 200,
      body: {
        protocolVersion: 'v1',
        version: '4.1.2',
        catalog: { schemaVersion: 1 },
      },
    })
  })

  it('returns typed allow and deny decisions in caller mode', async () => {
    const handler = createHandler()

    const allowed = await handler(
      jsonRequest(
        '/v1/check',
        { mode: 'caller', path: 'projects.update', data: project('user-1') },
        { authorization: 'Bearer user-1' }
      )
    )
    const denied = await handler(
      jsonRequest(
        '/v1/check',
        { mode: 'caller', path: 'projects.update', data: project('user-2') },
        { authorization: 'Bearer user-1' }
      )
    )

    await expect(read(allowed)).resolves.toStrictEqual({
      status: 200,
      body: { allowed: true },
    })
    await expect(read(denied)).resolves.toStrictEqual({
      status: 200,
      body: {
        allowed: false,
        error: { code: 'forbidden', message: 'Forbidden.' },
      },
    })
  })

  it('authenticates a service before resolving its explicit subject', async () => {
    const calls: string[] = []
    const handler = createHandler({
      authenticateService() {
        calls.push('service-auth')
        return null
      },
      resolveSubject() {
        calls.push('subject')
        return 'user-1'
      },
    })

    const response = await handler(
      jsonRequest('/v1/check', {
        mode: 'service',
        subject: 'user-1',
        path: 'projects.read',
      })
    )

    expect(response.status).toBe(401)
    expect(calls).toStrictEqual(['service-auth'])
  })

  it('prevents caller subject spoofing and rejects malformed transport', async () => {
    const handler = createHandler()
    const cases = [
      new Request('https://pdp.test/v1/check', {
        method: 'POST',
        body: '{',
      }),
      new Request('https://pdp.test/v1/check', {
        method: 'POST',
        body: '{"mode":"caller","path":"projects.update","data":NaN}',
      }),
      jsonRequest('/v1/check', []),
      jsonRequest('/v1/check', {
        mode: 'caller',
        subject: 'user-2',
        path: 'projects.read',
      }),
      jsonRequest('/v1/check', { mode: 'other', path: 'projects.read' }),
      jsonRequest('/v1/check', { mode: 'caller', path: '' }),
      jsonRequest('/v1/check', { mode: 'service', path: 'projects.read' }),
      jsonRequest('/v1/check', {
        mode: 'service',
        subject: '',
        path: 'projects.read',
      }),
      jsonRequest('/v1/check', {
        mode: 'caller',
        path: 'projects.read',
        unexpected: true,
      }),
    ]

    const responses = await Promise.all(
      cases.map(async (request) => read(await handler(request)))
    )
    for (const response of responses) {
      expect(response).toMatchObject({
        status: 400,
        body: { error: { code: 'invalid-request' } },
      })
    }
  })

  it('keeps valid batch decisions when sibling paths are malformed', async () => {
    const handler = createHandler()
    const response = await handler(
      jsonRequest(
        '/v1/check/batch',
        {
          mode: 'caller',
          checks: [
            { path: 'projects.read' },
            { path: '' },
            {},
            { path: 'projects.update', data: project('user-2') },
            { path: 'missing.path' },
          ],
        },
        { authorization: 'Bearer user-1' }
      )
    )

    await expect(read(response)).resolves.toStrictEqual({
      status: 200,
      body: {
        results: [
          { allowed: true },
          {
            error: {
              code: 'invalid-request',
              message: 'A check request requires a non-empty path.',
            },
          },
          {
            error: {
              code: 'invalid-request',
              message: 'A check request requires a non-empty path.',
            },
          },
          {
            allowed: false,
            error: { code: 'forbidden', message: 'Forbidden.' },
          },
          {
            error: {
              code: 'invalid-request',
              message: expect.any(String),
            },
          },
        ],
      },
    })
  })

  it('isolates concurrent requests and returns dehydrated permissions', async () => {
    const instances: Permix<TestDefinition>[] = []
    const handler = createHandler({
      createInstance() {
        const instance = createPermix<TestDefinition>()
        instances.push(instance)
        return instance
      },
    })

    const request = (tenant: string) =>
      handler(
        jsonRequest(
          '/v1/permissions',
          { mode: 'caller' },
          { authorization: 'Bearer user-1', 'x-tenant': tenant }
        )
      )
    const [open, blocked] = await Promise.all([
      request('open'),
      request('blocked'),
    ])

    const [openResult, blockedResult] = await Promise.all([
      read(open),
      read(blocked),
    ])
    expect(openResult.body).toStrictEqual({
      permissions: { projects: { read: true, update: false } },
    })
    expect(blockedResult.body).toStrictEqual({
      permissions: { projects: { read: false, update: false } },
    })
    expect(instances).toHaveLength(2)
    expect(instances[0]).not.toBe(instances[1])
  })

  it('redacts internal errors and maps unauthenticated callers to 401', async () => {
    const internal = createHandler({
      resolveRules() {
        throw new Error('database password')
      },
    })
    const unauthenticated = createHandler()

    await expect(
      internal(
        jsonRequest(
          '/v1/check',
          { mode: 'caller', path: 'projects.read' },
          { authorization: 'Bearer user-1' }
        )
      ).then(read)
    ).resolves.toStrictEqual({
      status: 500,
      body: { error: { code: 'internal-error', message: 'Internal error.' } },
    })
    await expect(
      unauthenticated(
        jsonRequest('/v1/check', {
          mode: 'caller',
          path: 'projects.read',
        })
      ).then(read)
    ).resolves.toStrictEqual({
      status: 401,
      body: { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
    })
  })

  it('rejects unsupported catalogs but tolerates additive v1 fields', () => {
    expect(() =>
      createPdpHandler({
        ...createHandlerOptions(),
        catalog: { schemaVersion: 2, permissions: [] } as never,
      })
    ).toThrow(/schemaVersion/)
    expect(() =>
      createPdpHandler({
        ...createHandlerOptions(),
        catalog: {
          schemaVersion: 1,
          futureField: true,
          permissions: [
            { key: 'projects.read', references: [], futureField: true },
          ],
        } as never,
      })
    ).not.toThrow()
  })
})

describe(createPdpOpenApiDocument, () => {
  it('is deterministic and derives path enums and descriptions from catalog', () => {
    const first = createPdpOpenApiDocument(catalog)
    const second = createPdpOpenApiDocument(catalog)
    const serialized = JSON.stringify(first)

    expect(JSON.stringify(second)).toBe(serialized)
    expect(serialized).toContain('"openapi":"3.1.0"')
    expect(serialized).toContain('"projects.read"')
    expect(serialized).toContain('"projects.update"')
    expect(serialized).toContain('View project details.')
    expect(serialized).toContain('Change a project owned by the caller.')
  })
})

describe(createPdpClient, () => {
  function createClient(headers: Record<string, string>) {
    const handler = createHandler()
    const fetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const request =
        input instanceof Request ? input : new Request(String(input), init)
      return handler(request)
    })
    return {
      client: createPdpClient<TestDefinition>({
        baseUrl: 'https://pdp.test',
        fetch,
        async headers() {
          return headers
        },
      }),
      fetch,
    }
  }

  it('is compatible with the handler for caller and service methods', async () => {
    const caller = createClient({ authorization: 'Bearer user-1' }).client
    const service = createClient({ 'x-service-token': 'trusted' }).client

    await expect(caller.check('projects.read')).resolves.toStrictEqual({
      allowed: true,
    })
    await expect(
      caller.check('projects.update', project('user-2'))
    ).resolves.toMatchObject({ allowed: false })
    await expect(
      service.checkAs('user-2', 'projects.update', project('user-2'))
    ).resolves.toStrictEqual({ allowed: true })
    await expect(
      service.checkManyAs('user-2', [
        { path: 'projects.update', data: project('user-2') },
      ])
    ).resolves.toStrictEqual([{ allowed: true }])
    await expect(service.permissionsAs('user-2')).resolves.toStrictEqual({
      projects: { read: true, update: false },
    })
  })

  it('returns partial batch errors and throws structured transport errors', async () => {
    const { client } = createClient({ authorization: 'Bearer user-1' })
    const results = await client.checkMany([
      { path: 'projects.read' },
      { path: 'missing.path' } as never,
    ])

    expect(results).toStrictEqual([
      { allowed: true },
      { error: { code: 'invalid-request', message: expect.any(String) } },
    ])

    const anonymous = createClient({}).client
    const error = await anonymous
      .check('projects.read')
      .catch((error: unknown) => error)
    expect(error).toBeInstanceOf(PdpClientError)
    expect(error).toMatchObject({
      status: 401,
      code: 'unauthenticated',
      message: 'Unauthenticated.',
    })

    const invalidSuccess = createPdpClient<TestDefinition>({
      fetch: async () =>
        new Response(
          JSON.stringify({
            error: { code: 'invalid-request', message: 'Bad envelope.' },
          }),
          { status: 200 }
        ),
    })
    await expect(invalidSuccess.check('projects.read')).rejects.toMatchObject({
      status: 200,
      code: 'invalid-request',
      message: 'Bad envelope.',
    })
  })

  it('preserves required data in client method types', () => {
    const client = createClient({}).client
    expectTypeOf(client.check).toBeCallableWith(
      'projects.update',
      project('user-1')
    )
    expectTypeOf(client.checkMany).toBeCallableWith([
      {
        path: 'projects.update',
        data: project('user-1'),
      },
    ] satisfies AdapterCheckRequest<TestDefinition>[])
    const invalid = () => {
      // @ts-expect-error projects.update requires project data
      void client.check('projects.update')
      // @ts-expect-error projects.update requires project data
      void client.checkAs('user-1', 'projects.update')
      // @ts-expect-error callbacks cannot cross the JSON transport boundary
      void client.check((check) => check('projects.read'))
    }
    expectTypeOf(invalid).toBeFunction()
  })
})

function project(ownerId: string) {
  return { id: 'project-1', ownerId }
}

function createHandlerOptions() {
  return {
    authenticateCaller: () => 'user-1',
    authenticateService: () => 'service',
    resolveSubject: ({ subject }: { subject: string }) => subject,
    resolveRules: () => ({
      projects: { read: true, update: () => false },
    }),
  }
}
