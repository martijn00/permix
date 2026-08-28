// @vitest-environment node
import type { SessionAuthObject } from '@clerk/backend'
import {
  signedInAuthObject,
  signedOutAuthObject,
} from '@clerk/backend/internal'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { AdapterError, serializeAdapterError } from '../adapter'
import type { Definition, DehydratedState, Rules } from '../core'
import { createPermix } from '../core'
import {
  CLERK_AUTHORIZATION_CAVEATS,
  ClerkPermixClientError,
  createClerkAuthorizationMapping,
  createClerkPermissionsHandler,
  createClerkPermix,
  createClerkPermixClient,
  createClerkRequestAuthenticator,
} from './index'
import type {
  ClerkAuthorizationMappingInput,
  ClerkPrincipal,
  ClerkRequestAuthenticator,
  ClerkSessionClaims,
} from './index'

// oxlint-disable-next-line typescript/consistent-type-definitions
type TestDefinition = {
  documents: [
    'read',
    {
      name: 'update'
      type: { ownerId: string }
      required: true
    },
  ]
  billing: ['manage']
}

const generatedDefinition = {
  tasks: ['comment', 'read'],
  workspace: {
    members: ['invite'],
  },
} as const

type GeneratedDefinition = typeof generatedDefinition
type TestClaims = ClerkSessionClaims & {
  readonly tenant: string
}

describe('Clerk Permix integration', () => {
  it('resolves authenticated direct Auth objects with async typed rules', async () => {
    const createInstance = vi.fn(() => createPermix<TestDefinition>())
    const integration = createClerkPermix<TestDefinition, TestClaims>({
      createInstance,
      async resolveRules(principal) {
        await Promise.resolve()
        expectTypeOf(principal).toEqualTypeOf<ClerkPrincipal<TestClaims>>()
        return documentRules(principal.userId)
      },
    })
    const auth = signedIn('user-1', {
      claims: { tenant: 'tenant-1' },
    })

    const first = await integration.resolve(auth)
    const second = await integration.resolve(auth)

    expect(first.principal).toMatchObject({
      userId: 'user-1',
      sessionId: 'session-user-1',
      sessionClaims: { tenant: 'tenant-1' },
    })
    expect(first.permix).not.toBe(second.permix)
    expect(createInstance).toHaveBeenCalledTimes(2)
    expect(first.permix.check('documents.update', { ownerId: 'user-1' })).toBe(
      true
    )
  })

  it('treats signed-out and malformed Auth objects as unauthenticated', async () => {
    const integration = createIntegration()
    const malformed = {
      isAuthenticated: true,
      has: () => true,
    } as unknown as SessionAuthObject

    const errors = await Promise.all(
      [signedOutAuthObject(), malformed].map((auth) =>
        integration.resolve(auth).catch((error: unknown) => error)
      )
    )

    for (const error of errors) {
      expect(serializeAdapterError(error)).toStrictEqual({
        code: 'unauthenticated',
        message: 'Unauthenticated.',
      })
    }
  })

  it('authenticates requests through injected current request-state APIs', async () => {
    const authenticated = signedIn('verified-user')
    const authenticateRequest = vi.fn(async (request: Request) => ({
      isAuthenticated:
        request.headers.get('authorization') === 'Bearer valid-token',
      toAuth: () => authenticated,
    })) satisfies ClerkRequestAuthenticator
    const integration = createClerkPermix<TestDefinition>({
      authenticateRequest,
      resolveRules: (principal) => documentRules(principal.userId),
    })

    const resolved = await integration.resolve(
      request({ authorization: 'Bearer valid-token', 'x-user-id': 'spoofed' })
    )

    expect(resolved.principal.userId).toBe('verified-user')
    expect(authenticateRequest).toHaveBeenCalledOnce()
    await expect(integration.resolve(request())).rejects.toSatisfy(
      (error: unknown) =>
        serializeAdapterError(error).code === 'unauthenticated'
    )
  })

  it('does not permit Request input without a configured authenticator', async () => {
    await expect(createIntegration().resolve(request())).rejects.toSatisfy(
      (error: unknown) =>
        serializeAdapterError(error).code === 'invalid-request'
    )
  })

  it('propagates resolver failures without leaking them from the handler', async () => {
    const integration = createClerkPermix<TestDefinition>({
      authenticateRequest: async () => ({
        isAuthenticated: true,
        toAuth: () => signedIn('user-1'),
      }),
      resolveRules: () => {
        throw new Error('database password is secret')
      },
    })

    await expect(integration.resolve(signedIn('user-1'))).rejects.toThrow(
      'database password is secret'
    )
    const response = await createClerkPermissionsHandler(integration)(request())
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toStrictEqual({
      error: { code: 'internal-error', message: 'Internal error.' },
    })
  })

  it('keeps two configurations and concurrent users isolated', async () => {
    const firstIntegration = createClerkPermix<TestDefinition>({
      resolveRules: () => fixedRules(true),
    })
    const secondIntegration = createClerkPermix<TestDefinition>({
      resolveRules: () => fixedRules(false),
    })

    await expect(
      firstIntegration.dehydrate(signedIn('same-user'))
    ).resolves.toMatchObject({ documents: { read: true } })
    await expect(
      secondIntegration.dehydrate(signedIn('same-user'))
    ).resolves.toMatchObject({ documents: { read: false } })

    const concurrent = createIntegration()
    const [first, second] = await Promise.all([
      concurrent.resolve(signedIn('first')),
      concurrent.resolve(signedIn('second')),
    ])
    expect(first.permix).not.toBe(second.permix)
    expect(first.permix.check('documents.update', { ownerId: 'first' })).toBe(
      true
    )
    expect(second.permix.check('documents.update', { ownerId: 'first' })).toBe(
      false
    )
  })
})

describe('Clerk authorization mapping', () => {
  const mapping = createClerkAuthorizationMapping<TestDefinition>({
    'documents.read': { permission: 'org:documents:read' },
    'documents.update': { role: 'org:editor' },
  })

  it('maps arbitrary canonical paths through Auth.has()', async () => {
    const resolution = await createIntegration().resolve(
      signedIn('user-1', {
        orgId: 'org-1',
        permissions: ['org:documents:read'],
        role: 'org:editor',
      })
    )
    const principal = resolution.principal

    expect(mapping.check(principal, 'documents.read')).toBe(true)
    expect(mapping.check(principal, 'documents.update')).toBe(true)

    const deniedResolution = await createIntegration().resolve(
      signedIn('user-2', { orgId: 'org-1' })
    )
    const denied = deniedResolution.principal
    expect(mapping.check(denied, 'documents.read')).toBe(false)
    expect(mapping.check(denied, 'documents.update')).toBe(false)
  })

  it('denies permission and role mappings without an active organization', async () => {
    const resolution = await createIntegration().resolve(
      signedIn('user-1', {
        permissions: ['org:documents:read'],
        role: 'org:editor',
      })
    )
    const principal = resolution.principal

    expect(mapping.check(principal, 'documents.read')).toBe(false)
    expect(mapping.check(principal, 'documents.update')).toBe(false)
  })

  it('rejects the system-permission boundary and publishes freshness caveats', () => {
    expect(() =>
      createClerkAuthorizationMapping<TestDefinition>({
        'documents.read': {
          permission: 'org:sys_memberships:manage',
        },
      })
    ).toThrow('system permissions')
    expect(CLERK_AUTHORIZATION_CAVEATS.customPermissionsOnly).toContain(
      'custom organization permissions'
    )
    expect(CLERK_AUTHORIZATION_CAVEATS.staleClaims).toContain('stale')
  })

  it('reports unknown and uncovered catalog permissions', () => {
    const entries = {
      'documents.read': { permission: 'org:documents:read' },
      'unknown.action': { role: 'org:admin' },
    } as unknown as ClerkAuthorizationMappingInput<TestDefinition>
    const covered = createClerkAuthorizationMapping(entries, {
      catalog: {
        schemaVersion: 1,
        permissions: [
          { key: 'documents.read', references: [] },
          { key: 'documents.update', references: [] },
          { key: 'billing.manage', references: [] },
        ],
      },
    })

    expect(covered.coverage).toStrictEqual({
      valid: false,
      unknown: ['unknown.action'],
      uncovered: ['billing.manage', 'documents.update'],
    })
  })
})

describe('Clerk permissions transport', () => {
  it('dehydrates through a Fetch handler and hydrates the UX client', async () => {
    const seenAuthorization: string[] = []
    const integration = createClerkPermix<TestDefinition>({
      authenticateRequest: async (incoming) => {
        seenAuthorization.push(
          incoming.headers.get('authorization') ?? 'missing'
        )
        return {
          isAuthenticated: true,
          toAuth: () => signedIn('user-1'),
        }
      },
      resolveRules: (principal) => documentRules(principal.userId),
    })
    const handler = createClerkPermissionsHandler(integration)
    const getToken = vi.fn(async () => 'org-token')
    const client = createClerkPermixClient<TestDefinition>({
      endpoint: 'https://app.example.test/api/permissions',
      organizationId: 'org-1',
      getToken,
      fetch: async (input, init) => handler(new Request(input, init)),
    })

    await expect(client.getPermissions()).resolves.toStrictEqual({
      documents: { read: true, update: false },
      billing: { manage: false },
    })
    const hydrated = await client.getPermix()
    expect(hydrated.check('documents.read')).toBe(true)
    expect(hydrated.isReady()).toBe(true)
    expect(getToken).toHaveBeenCalledWith({ organizationId: 'org-1' })
    expect(seenAuthorization).toStrictEqual([
      'Bearer org-token',
      'Bearer org-token',
    ])
  })

  it('returns structured auth errors without sending a request when signed out', async () => {
    const fetchImplementation = vi.fn<typeof fetch>()
    const client = createClerkPermixClient<TestDefinition>({
      getToken: async () => null,
      fetch: fetchImplementation,
    })

    await expect(client.getPermissions()).rejects.toMatchObject({
      status: 401,
      code: 'unauthenticated',
      message: 'Unauthenticated.',
    } satisfies Partial<ClerkPermixClientError>)
    expect(fetchImplementation).not.toHaveBeenCalled()
  })

  it('rejects malformed endpoint payloads with structured errors', async () => {
    const client = createClerkPermixClient<TestDefinition>({
      getToken: async () => 'token',
      fetch: async () => Response.json({ unexpected: true }),
    })

    await expect(client.getPermissions()).rejects.toMatchObject({
      code: 'internal-error',
      message: 'Clerk permissions endpoint returned an invalid payload.',
    })
  })

  it('maps adapter status codes and malformed client responses', async () => {
    const post = await createClerkPermissionsHandler(createIntegration())(
      new Request('https://app.example.test/api/permissions', {
        method: 'POST',
      })
    )
    expect(post.status).toBe(400)

    const forbidden = createClerkPermissionsHandler(
      createClerkPermix<TestDefinition>({
        authenticateRequest: async () => signedIn('user-1'),
        resolveRules: () => {
          throw new AdapterError('forbidden', 'No access.')
        },
      })
    )
    const forbiddenResponse = await forbidden(
      request({ authorization: 'Bearer token' })
    )
    expect(forbiddenResponse.status).toBe(403)

    const unauthenticated = createClerkPermissionsHandler(
      createClerkPermix<TestDefinition>({
        authenticateRequest: async () => signedOutAuthObject(),
        resolveRules: () => fixedRules(true),
      })
    )
    const unauthenticatedResponse = await unauthenticated(
      request({ authorization: 'Bearer token' })
    )
    expect(unauthenticatedResponse.status).toBe(401)

    const invalid = createClerkPermissionsHandler(
      createClerkPermix<TestDefinition>({
        authenticateRequest: async () => signedIn('user-1'),
        resolveRules: () => {
          throw new AdapterError('validation-failure', 'Bad data.', [
            { message: 'required', path: ['data'] },
          ])
        },
      })
    )
    const invalidResponse = await invalid(
      request({ authorization: 'Bearer token' })
    )
    expect(invalidResponse.status).toBe(400)
    await expect(invalidResponse.json()).resolves.toMatchObject({
      error: { code: 'validation-failure', issues: [{ message: 'required' }] },
    })

    const client = createClerkPermixClient<TestDefinition>({
      getToken: async () => 'token',
      organizationId: async () => 'org-1',
      fetch: async () =>
        new Response('not-json', {
          status: 500,
          headers: { 'content-type': 'text/plain' },
        }),
    })
    await expect(client.getPermissions()).rejects.toMatchObject({
      code: 'internal-error',
      message: 'Clerk permissions endpoint returned invalid JSON.',
    })

    const errorClient = createClerkPermixClient<TestDefinition>({
      getToken: async () => 'token',
      fetch: async () =>
        Response.json(
          {
            error: {
              code: 'forbidden',
              message: 'No access.',
              issues: [{ message: 'denied' }],
            },
          },
          { status: 403 }
        ),
    })
    await expect(errorClient.getPermissions()).rejects.toMatchObject({
      status: 403,
      code: 'forbidden',
      issues: [{ message: 'denied' }],
    })

    const emptyToken = createClerkPermixClient<TestDefinition>({
      getToken: async () => '',
      fetch: vi.fn<typeof fetch>(),
    })
    await expect(emptyToken.getPermissions()).rejects.toMatchObject({
      status: 401,
      code: 'unauthenticated',
    })
  })

  it('accepts a SessionAuthObject from authenticateRequest and a catalog', async () => {
    const integration = createClerkPermix<TestDefinition>({
      catalog: {
        schemaVersion: 1,
        permissions: [{ key: 'documents.read', references: [] }],
      },
      authenticateRequest: async () => signedIn('user-1'),
      resolveRules: (principal) => documentRules(principal.userId),
    })

    const resolved = await integration.resolve(request())
    expect(resolved.principal.userId).toBe('user-1')
    expect(integration.catalog?.permissions).toHaveLength(1)
  })

  it('treats unrecognized authenticateRequest results as signed out', async () => {
    const integration = createClerkPermix<TestDefinition>({
      authenticateRequest: async () => ({ unexpected: true }) as never,
      resolveRules: () => fixedRules(true),
    })
    await expect(integration.resolve(request())).rejects.toSatisfy(
      (error: unknown) =>
        serializeAdapterError(error).code === 'unauthenticated'
    )
  })

  it('uses global fetch and maps non-error failure bodies', async () => {
    const fetchImplementation = vi.fn(async () =>
      Response.json({ unexpected: true }, { status: 500 })
    )
    const previous = globalThis.fetch
    globalThis.fetch = fetchImplementation
    try {
      const client = createClerkPermixClient<TestDefinition>({
        getToken: async () => 'token',
      })
      await expect(client.getPermissions()).rejects.toMatchObject({
        status: 500,
        code: 'internal-error',
        message: 'Clerk permissions request failed.',
      })
      expect(fetchImplementation).toHaveBeenCalledWith(
        '/api/permix/clerk/permissions',
        expect.objectContaining({ method: 'GET' })
      )
    } finally {
      globalThis.fetch = previous
    }
  })
})

describe('Clerk public types', () => {
  it('supports manual and generated definitions', () => {
    const manual = createIntegration()
    const generated = createClerkPermix<GeneratedDefinition>({
      resolveRules: () => ({
        tasks: { comment: true, read: false },
        workspace: { members: { invite: true } },
      }),
    })

    expectTypeOf(manual).toMatchTypeOf<{
      dehydrate: (
        input: Request | SessionAuthObject
      ) => Promise<DehydratedState<TestDefinition>>
    }>()
    expectTypeOf(generated.dehydrate).returns.resolves.toEqualTypeOf<
      DehydratedState<GeneratedDefinition>
    >()
  })
})

function createIntegration() {
  return createClerkPermix<TestDefinition>({
    resolveRules: (principal) => documentRules(principal.userId),
  })
}

function documentRules(ownerId: string): Rules<TestDefinition> {
  return {
    documents: {
      read: true,
      update: (document) => document.ownerId === ownerId,
    },
    billing: { manage: false },
  }
}

function fixedRules(read: boolean): Rules<TestDefinition> {
  return {
    documents: { read, update: () => false },
    billing: { manage: false },
  }
}

function request(headers?: Headers | Record<string, string>): Request {
  return new Request(
    'https://app.example.test/api/permissions',
    headers === undefined ? {} : { headers }
  )
}

function signedIn(
  userId: string,
  options: {
    readonly claims?: Record<string, unknown>
    readonly orgId?: string
    readonly permissions?: readonly string[]
    readonly role?: string
  } = {}
): SessionAuthObject {
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    __raw: '',
    iss: 'https://clerk.example.test',
    sub: userId,
    sid: `session-${userId}`,
    nbf: now - 1,
    exp: now + 60,
    iat: now,
    ...options.claims,
    ...(options.orgId === undefined ? {} : { org_id: options.orgId }),
    ...(options.permissions === undefined
      ? {}
      : { org_permissions: options.permissions }),
    ...(options.role === undefined ? {} : { org_role: options.role }),
  } as ClerkSessionClaims
  return signedInAuthObject({}, `token-${userId}`, claims)
}

describe(createClerkRequestAuthenticator, () => {
  it('authenticates through a client instance and a factory with options', async () => {
    const authenticateRequest = vi.fn(async () => signedOutAuthObject())
    const authenticator = createClerkRequestAuthenticator({
      authenticateRequest: authenticateRequest as never,
    })
    const request = new Request('https://example.com')
    await authenticator(request)
    expect(authenticateRequest).toHaveBeenCalledWith(request)

    const withOptions = createClerkRequestAuthenticator(
      async () => ({ authenticateRequest }) as never,
      { secretKey: 'sk_test' }
    )
    await withOptions(request)
    expect(authenticateRequest).toHaveBeenCalledWith(request, {
      secretKey: 'sk_test',
    })
  })
})

expectTypeOf<TestDefinition>().toMatchTypeOf<Definition>()
