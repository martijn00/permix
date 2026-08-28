import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { serializeAdapterError } from '../adapter'
import type { Definition, Rules } from '../core'
import { createPermix } from '../core'
import {
  createSupabaseClaimsAdapter,
  createSupabaseUserAdapter,
  extractSupabaseBearerToken,
  verifySupabaseClaims,
  verifySupabaseUser,
} from './index'
import type { SupabaseClaimsPrincipal, SupabaseUserPrincipal } from './index'

// A type alias preserves concrete Definition keys without an index signature.
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
}

interface TestClaims {
  readonly sub: string
  readonly role: string
  readonly app_metadata: {
    readonly permissions: readonly string[]
  }
  readonly user_metadata?: {
    readonly admin?: boolean
  }
}

interface TestUser {
  readonly id: string
  readonly app_metadata: {
    readonly role: string
  }
  readonly user_metadata?: {
    readonly role?: string
  }
}

describe(extractSupabaseBearerToken, () => {
  it('extracts a single bearer token from strings, headers, and requests', () => {
    const headers = {
      get: (name: string) =>
        name.toLowerCase() === 'authorization' ? 'Bearer header-token' : null,
    }

    expect(extractSupabaseBearerToken('bearer string-token')).toBe(
      'string-token'
    )
    expect(extractSupabaseBearerToken(headers)).toBe('header-token')
    expect(extractSupabaseBearerToken({ headers })).toBe('header-token')
  })

  it.each([
    '',
    'Basic token',
    'Bearer',
    'Bearer two tokens',
    'Bearer token, Basic other',
    'Bearer token\r\nX-Injected: value',
  ])('rejects malformed authorization input %j', (input) => {
    expect(extractSupabaseBearerToken(input)).toBeNull()
  })
})

describe('Supabase verification', () => {
  it('uses getClaims and removes user-controlled metadata', async () => {
    const client = claimsClient({
      sub: 'user-1',
      role: 'authenticated',
      app_metadata: { permissions: ['documents.read'] },
      user_metadata: { admin: true },
    })

    await expect(
      verifySupabaseClaims(client, 'Bearer claims-token')
    ).resolves.toStrictEqual({
      token: 'claims-token',
      claims: {
        sub: 'user-1',
        role: 'authenticated',
        app_metadata: { permissions: ['documents.read'] },
      },
    })
  })

  it('uses getUser and removes user-controlled metadata', async () => {
    const client = userClient({
      id: 'user-1',
      app_metadata: { role: 'editor' },
      user_metadata: { role: 'admin' },
    })

    await expect(
      verifySupabaseUser(client, 'Bearer user-token')
    ).resolves.toStrictEqual({
      token: 'user-token',
      user: {
        id: 'user-1',
        app_metadata: { role: 'editor' },
      },
    })
  })

  it.each([
    claimsClient<TestClaims>(null),
    claimsClient<TestClaims>(null, new Error('invalid token')),
    {
      auth: {
        getClaims: async () => {
          throw new Error('provider unavailable')
        },
      },
    },
  ])(
    'treats missing claims and provider failures as signed out',
    async (client) => {
      await expect(
        verifySupabaseClaims(client, 'Bearer invalid')
      ).resolves.toBeNull()
    }
  )

  it.each([
    userClient<TestUser>(null),
    userClient<TestUser>(null, new Error('invalid token')),
    {
      auth: {
        getUser: async () => {
          throw new Error('provider unavailable')
        },
      },
    },
  ])(
    'treats missing users and provider failures as signed out',
    async (client) => {
      await expect(
        verifySupabaseUser(client, 'Bearer invalid')
      ).resolves.toBeNull()
      await expect(
        verifySupabaseUser(client, { get: () => null })
      ).resolves.toBeNull()
    }
  )
})

describe('configured Supabase adapters', () => {
  it('exposes typed verified claims to asynchronous rules', async () => {
    const adapter = createSupabaseClaimsAdapter<
      TestDefinition,
      TestClaims,
      string
    >({
      client: Promise.resolve(
        claimsClient({
          sub: 'user-1',
          role: 'authenticated',
          app_metadata: { permissions: ['documents.read'] },
        })
      ),
      async resolveRules({ principal }) {
        await Promise.resolve()
        expectTypeOf(principal).toEqualTypeOf<
          SupabaseClaimsPrincipal<TestClaims>
        >()
        return documentRules(principal.claims.sub)
      },
    })

    await expect(
      adapter.check('Bearer claims-token', 'documents.read')
    ).resolves.toStrictEqual({ allowed: true })
    const resolved = await adapter.resolve('Bearer claims-token')
    expect(resolved.principal.claims.sub).toBe('user-1')
    expect('user_metadata' in resolved.principal.claims).toBe(false)
  })

  it('exposes typed verified users and supports an async client factory', async () => {
    const adapter = createSupabaseUserAdapter<TestDefinition, TestUser, string>(
      {
        async client() {
          await Promise.resolve()
          return userClient({
            id: 'user-2',
            app_metadata: { role: 'member' },
          })
        },
        resolveRules({ principal }) {
          expectTypeOf(principal).toEqualTypeOf<
            SupabaseUserPrincipal<TestUser>
          >()
          return documentRules(principal.user.id)
        },
      }
    )

    const resolved = await adapter.resolve('Bearer user-token')
    expect(resolved.principal.user.id).toBe('user-2')
  })

  it('turns malformed inputs and verification failures into adapter auth errors', async () => {
    const adapter = createSupabaseClaimsAdapter<
      TestDefinition,
      TestClaims,
      string
    >({
      client: claimsClient<TestClaims>(null, new Error('invalid token')),
      resolveRules: () => documentRules('nobody'),
    })

    const errors = await Promise.all(
      ['Basic token', 'Bearer invalid'].map((input) =>
        adapter.resolve(input).catch((error: unknown) => error)
      )
    )

    for (const error of errors) {
      expect(serializeAdapterError(error)).toStrictEqual({
        code: 'unauthenticated',
        message: 'Unauthenticated.',
      })
    }
  })

  it('keeps rules and Permix instances isolated across concurrent calls', async () => {
    const adapter = createSupabaseClaimsAdapter<
      TestDefinition,
      TestClaims,
      string
    >({
      client: async () =>
        claimsClient(
          {
            sub: 'unused',
            role: 'authenticated',
            app_metadata: { permissions: [] },
          },
          null,
          (token) => ({
            sub: token,
            role: 'authenticated',
            app_metadata: { permissions: [] },
          })
        ),
      async resolveRules({ principal }) {
        await Promise.resolve()
        return documentRules(principal.claims.sub)
      },
    })

    const [first, second] = await Promise.all([
      adapter.resolve('Bearer first'),
      adapter.resolve('Bearer second'),
    ])

    expect(first.permix).not.toBe(second.permix)
    expect(first.permix.check('documents.update', { ownerId: 'first' })).toBe(
      true
    )
    expect(first.permix.check('documents.update', { ownerId: 'second' })).toBe(
      false
    )
    expect(second.permix.check('documents.update', { ownerId: 'second' })).toBe(
      true
    )
  })

  it('forwards explicit catalogs and instance factories to the adapter kernel', async () => {
    const createInstance = vi.fn(() => createPermix<TestDefinition>())
    const adapter = createSupabaseClaimsAdapter<
      TestDefinition,
      TestClaims,
      string
    >({
      client: claimsClient({
        sub: 'user-1',
        role: 'authenticated',
        app_metadata: { permissions: [] },
      }),
      catalog: {
        schemaVersion: 1,
        permissions: [
          { key: 'documents.read', references: [] },
          { key: 'documents.update', references: [] },
        ],
      },
      createInstance,
      resolveRules: ({ principal }) => documentRules(principal.claims.sub),
    })

    await adapter.resolve('Bearer token')

    expect(createInstance).toHaveBeenCalledOnce()
    expect(adapter.validateCoverage(['documents.read'])).toStrictEqual({
      valid: false,
      unknown: [],
      uncovered: ['documents.update'],
    })
  })
})

function claimsClient<Claims>(
  claims: Claims | null,
  error: unknown = null,
  resolve?: (token: string) => Claims
) {
  return {
    auth: {
      async getClaims(token: string) {
        return {
          data: { claims: resolve?.(token) ?? claims },
          error,
        }
      },
    },
  }
}

function userClient<User>(user: User | null, error: unknown = null) {
  return {
    auth: {
      async getUser(_token: string) {
        return { data: { user }, error }
      },
    },
  }
}

function documentRules(ownerId: string) {
  return {
    documents: {
      read: true,
      update: (document: { ownerId: string }) => document.ownerId === ownerId,
    },
  } satisfies Rules<TestDefinition>
}

expectTypeOf<TestDefinition>().toMatchTypeOf<Definition>()
