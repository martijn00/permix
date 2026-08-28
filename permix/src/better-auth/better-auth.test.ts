// @vitest-environment node
import { createAuthClient } from 'better-auth/client'
import { createAccessControl } from 'better-auth/plugins/access'
import { getTestInstance } from 'better-auth/test'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { serializeAdapterError } from '../adapter'
import type { Definition, DehydratedState, Rules } from '../core'
import { createPermix } from '../core'
import {
  checkBetterAuthRequest,
  createBetterAuthPermixClient,
  createBetterAuthPermixPlugin,
  inferDefinitionFromAccessControl,
  resolveBetterAuthRequest,
  rulesFromBetterAuthRole,
} from './index'
import type {
  BetterAuthPermixPlugin,
  BetterAuthSession,
  DefinitionFromAccessControl,
} from './index'

// oxlint-disable-next-line typescript/consistent-type-definitions
type TestDefinition = {
  posts: [
    'read',
    {
      name: 'update'
      type: { ownerId: string }
      required: true
    },
  ]
  users: ['delete']
}

type TestSession = BetterAuthSession & {
  readonly user: BetterAuthSession['user'] & {
    readonly role: 'admin' | 'member'
  }
}

const generatedPermissionDefinition = {
  tasks: ['comment', 'read'],
  workspace: {
    members: ['invite'],
  },
} as const

type GeneratedDefinition = typeof generatedPermissionDefinition

async function requestPermissions(
  auth: { handler: (request: Request) => Promise<Response> },
  headers?: Headers
) {
  return auth.handler(
    new Request('http://localhost:3000/api/auth/permix/get-permissions', {
      method: 'GET',
      ...(headers === undefined ? {} : { headers }),
    })
  )
}

describe('Better Auth server plugin', () => {
  it('uses a real authenticated Better Auth session and dehydrates async rules', async () => {
    const createInstance = vi.fn(() => createPermix<TestDefinition>())
    const plugin = createBetterAuthPermixPlugin<TestDefinition>({
      async resolveRules(session) {
        await Promise.resolve()
        return testRules(session.user.id)
      },
      createInstance,
    })
    const { auth, signInWithTestUser } = await getTestInstance({
      plugins: [plugin],
    })
    const { headers, user } = await signInWithTestUser()

    const response = await requestPermissions(auth, headers)

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    await expect(response.json()).resolves.toStrictEqual({
      posts: { read: true, update: false },
      users: { delete: false },
    })
    const direct = await auth.api.getPermissions({ headers })
    expect(direct.posts.read).toBe(true)
    expect(user.id).toBeTruthy()
    expect(createInstance).toHaveBeenCalledTimes(2)
  })

  it('rejects signed-out and malformed session requests', async () => {
    const { auth } = await getTestInstance({
      plugins: [createPlugin()],
    })

    const signedOut = await requestPermissions(auth)
    const malformed = await requestPermissions(
      auth,
      new Headers({ cookie: 'better-auth.session_token=not-a-session' })
    )

    expect(signedOut.status).toBe(401)
    expect(malformed.status).toBe(401)
  })

  it('propagates rule-resolution failures without returning permissions', async () => {
    const failure = new Error('rules unavailable')
    const plugin = createBetterAuthPermixPlugin<TestDefinition>({
      resolveRules: () => Promise.reject(failure),
    })

    await expect(plugin.dehydrateSession(testSession('user-1'))).rejects.toBe(
      failure
    )
  })

  it('keeps two configured plugins isolated in the same process', async () => {
    const first = createBetterAuthPermixPlugin<TestDefinition>({
      resolveRules: () => ({
        posts: { read: true, update: () => false },
        users: { delete: false },
      }),
    })
    const second = createBetterAuthPermixPlugin<TestDefinition>({
      resolveRules: () => ({
        posts: { read: false, update: () => true },
        users: { delete: true },
      }),
    })
    const session = testSession('user-1')

    await expect(first.dehydrateSession(session)).resolves.toStrictEqual({
      posts: { read: true, update: false },
      users: { delete: false },
    })
    await expect(second.dehydrateSession(session)).resolves.toStrictEqual({
      posts: { read: false, update: true },
      users: { delete: true },
    })
  })

  it('creates isolated Permix instances for concurrent users', async () => {
    const plugin = createBetterAuthPermixPlugin<TestDefinition>({
      async resolveRules(session) {
        await Promise.resolve()
        return testRules(session.user.id)
      },
    })

    const [first, second] = await Promise.all([
      plugin.resolveSession(testSession('first')),
      plugin.resolveSession(testSession('second')),
    ])

    expect(first.permix).not.toBe(second.permix)
    expect(first.permix.check('posts.update', { ownerId: 'first' })).toBe(true)
    expect(first.permix.check('posts.update', { ownerId: 'second' })).toBe(
      false
    )
    expect(second.permix.check('posts.update', { ownerId: 'second' })).toBe(
      true
    )
  })

  it('exposes session helpers and request helpers through the shared kernel', async () => {
    const plugin = createPlugin()
    const { auth, signInWithTestUser } = await getTestInstance({
      plugins: [plugin],
    })
    const { headers, user } = await signInWithTestUser()

    const resolved = await resolveBetterAuthRequest(auth, plugin, headers)
    const allowed = await checkBetterAuthRequest(
      auth,
      plugin,
      new Request('http://localhost/private', { headers }),
      'posts.update',
      { ownerId: user.id }
    )

    expect(resolved.principal.user.id).toBe(user.id)
    expect(allowed).toStrictEqual({ allowed: true })
    await expect(
      plugin.checkSession(testSession('user-1'), 'posts.read')
    ).resolves.toMatchObject({ allowed: true })
    await expect(
      plugin.checkSession(testSession('user-1'), 'users.delete')
    ).resolves.toMatchObject({ allowed: false, error: { code: 'forbidden' } })
    await expect(plugin.resolveSession(null)).rejects.toSatisfy(
      (error: unknown) =>
        serializeAdapterError(error).code === 'unauthenticated'
    )
  })

  it('forwards catalog, createInstance, and coverage validation', async () => {
    const createInstance = vi.fn(() => createPermix<TestDefinition>())
    const plugin = createBetterAuthPermixPlugin<TestDefinition>({
      resolveRules: (session) => testRules(session.user.id),
      createInstance,
      catalog: {
        schemaVersion: 1,
        permissions: [
          { key: 'posts.read', references: [] },
          { key: 'posts.update', references: [] },
          { key: 'users.delete', references: [] },
        ],
      },
    })

    await plugin.resolveSession(testSession('user-1'))

    expect(createInstance).toHaveBeenCalledOnce()
    expect(plugin.catalog?.permissions).toHaveLength(3)
    expect(
      plugin.validateCoverage(['posts.read', 'unknown.action'])
    ).toStrictEqual({
      valid: false,
      unknown: ['unknown.action'],
      uncovered: ['posts.update', 'users.delete'],
    })
  })
})

describe('Better Auth access-control interop', () => {
  const statements = {
    posts: ['read', 'update'],
    users: ['delete'],
  } as const
  const access = createAccessControl(statements)

  it('optionally infers a Definition from current access-control statements', () => {
    const definition = inferDefinitionFromAccessControl(access.statements)

    expect(definition).toBe(statements)
    expectTypeOf<
      DefinitionFromAccessControl<typeof statements>
    >().toEqualTypeOf<{
      readonly posts: readonly ['read', 'update']
      readonly users: readonly ['delete']
    }>()
    expectTypeOf(definition).toMatchTypeOf<Definition>()
  })

  it('maps roles to complete deny-by-default rules', () => {
    const editor = access.newRole({ posts: ['read'] })

    expect(rulesFromBetterAuthRole(access.statements, editor)).toStrictEqual({
      posts: { read: true, update: false },
      users: { delete: false },
    })
  })

  it('denies every action when a statement list is missing', () => {
    const role = access.newRole({ posts: ['read'] })
    expect(
      rulesFromBetterAuthRole(
        {
          posts: ['read', 'update'],
          users: undefined as unknown as ['delete'],
        },
        role
      )
    ).toStrictEqual({
      posts: { read: true, update: false },
      users: {},
    })
  })
})

describe('Better Auth public types', () => {
  it('supports manual and generated definitions', () => {
    const manual = createPlugin()
    const generated = createBetterAuthPermixPlugin<GeneratedDefinition>({
      resolveRules: () => ({
        tasks: { comment: true, read: false },
        workspace: { members: { invite: true } },
      }),
    })

    expectTypeOf(manual).toMatchTypeOf<BetterAuthPermixPlugin<TestDefinition>>()
    expectTypeOf(generated.dehydrateSession).returns.resolves.toEqualTypeOf<
      DehydratedState<GeneratedDefinition>
    >()
  })

  it('infers the generated client endpoint from the server plugin', () => {
    const serverPlugin = createPlugin()
    const client = createAuthClient({
      plugins: [createBetterAuthPermixClient<typeof serverPlugin>()],
    })

    type ClientResult = Awaited<ReturnType<typeof client.permix.getPermissions>>

    expectTypeOf(client.permix.getPermissions).toBeFunction()
    expectTypeOf<ClientResult>().toMatchTypeOf<{
      data: DehydratedState<TestDefinition> | null
    }>()
  })

  it('types custom Better Auth session fields in the rules resolver', () => {
    createBetterAuthPermixPlugin<TestDefinition, TestSession>({
      resolveRules(session) {
        expectTypeOf(session.user.role).toEqualTypeOf<'admin' | 'member'>()
        return {
          posts: {
            read: true,
            update: ({ ownerId }) =>
              session.user.role === 'admin' || ownerId === session.user.id,
          },
          users: { delete: session.user.role === 'admin' },
        }
      },
    })
  })
})

function createPlugin() {
  return createBetterAuthPermixPlugin<TestDefinition>({
    resolveRules: (session) => testRules(session.user.id),
  })
}

function testRules(ownerId: string): Rules<TestDefinition> {
  return {
    posts: {
      read: true,
      update: (post) => post.ownerId === ownerId,
    },
    users: { delete: false },
  }
}

function testSession(userId: string): TestSession {
  const now = new Date()
  return {
    session: {
      id: `session-${userId}`,
      token: `token-${userId}`,
      userId,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
    },
    user: {
      id: userId,
      name: userId,
      email: `${userId}@example.com`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      role: 'member',
    },
  }
}

expectTypeOf<TestDefinition>().toMatchTypeOf<Definition>()
