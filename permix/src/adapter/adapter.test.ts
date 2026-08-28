import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import type { ApplyPermissionOverlay, Definition } from '../core'
import { createPermix } from '../core'
import { PermixValidationError } from '../standard-schema'
import { AdapterError, createAdapter, serializeAdapterError } from './index'
import type { AdapterCheckRequest, PermissionAdapter } from './index'

// A type alias preserves concrete keys under Definition's recursive record
// constraint; an interface would require a widening index signature.
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

const generatedPermissionDefinition = {
  tasks: ['comment', 'delete', 'read'],
  workspace: {
    members: ['invite'],
  },
} as const

type GeneratedExtractedDefinition = typeof generatedPermissionDefinition
type GeneratedDefinition<
  Overlay extends Definition = GeneratedExtractedDefinition,
> = ApplyPermissionOverlay<GeneratedExtractedDefinition, Overlay>

describe(createAdapter, () => {
  it('resolves an authenticated principal into a ready Permix instance', async () => {
    const adapter = createAdapter<TestDefinition, { token?: string }, string>({
      authenticate: ({ token }) => token ?? null,
      resolveRules: ({ principal }) => ({
        projects: {
          read: principal === 'admin',
          update: ({ ownerId }) => principal === ownerId,
        },
      }),
    })

    const resolved = await adapter.resolve({ token: 'admin' })

    expect(resolved.principal).toBe('admin')
    expect(resolved.permix.check('projects.read')).toBe(true)
  })

  it('rejects signed-out inputs with a serializable unauthenticated error', async () => {
    const adapter = createTestAdapter()

    const error = await adapter.resolve({}).catch((error: unknown) => error)

    expect(serializeAdapterError(error)).toStrictEqual({
      code: 'unauthenticated',
      message: 'Unauthenticated.',
    })
  })

  it('awaits authentication and rule resolution before setup', async () => {
    const calls: string[] = []
    const adapter = createAdapter<TestDefinition, { token: string }, string>({
      async authenticate({ token }) {
        await Promise.resolve()
        calls.push(`authenticate:${token}`)
        return token
      },
      async resolveRules({ input, principal }) {
        await Promise.resolve()
        calls.push(`rules:${input.token}:${principal}`)
        return {
          projects: {
            read: true,
            update: ({ ownerId }) => ownerId === principal,
          },
        }
      },
      createInstance() {
        calls.push('create')
        const permix = createPermix<TestDefinition>()
        permix.hook('setup', () => calls.push('setup'))
        return permix
      },
    })

    await adapter.resolve({ token: 'user-1' })

    expect(calls).toStrictEqual([
      'authenticate:user-1',
      'rules:user-1:user-1',
      'create',
      'setup',
    ])
  })

  it('creates isolated instances for concurrent invocations', async () => {
    const adapter = createTestAdapter()

    const [first, second] = await Promise.all([
      adapter.resolve({ token: 'first' }),
      adapter.resolve({ token: 'second' }),
    ])

    expect(first.permix).not.toBe(second.permix)
    expect(first.permix.check('projects.update', project('first'))).toBe(true)
    expect(second.permix.check('projects.update', project('first'))).toBe(false)
  })

  it('uses a caller-supplied instance factory once per invocation', async () => {
    const createInstance = vi.fn(() => createPermix<TestDefinition>())
    const adapter = createTestAdapter({ createInstance })

    const first = await adapter.resolve({ token: 'first' })
    const second = await adapter.resolve({ token: 'second' })

    expect(createInstance).toHaveBeenCalledTimes(2)
    expect(first.permix).not.toBe(second.permix)
  })

  it('runs typed single and batch checks without changing core decisions', async () => {
    const adapter = createTestAdapter()

    await expect(
      adapter.check({ token: 'user-1' }, 'projects.read')
    ).resolves.toStrictEqual({ allowed: true })
    await expect(
      adapter.check(
        { token: 'user-1' },
        'projects.update',
        project('someone-else')
      )
    ).resolves.toStrictEqual({
      allowed: false,
      error: { code: 'forbidden', message: 'Forbidden.' },
    })
    await expect(
      adapter.checkMany({ token: 'user-1' }, [
        { path: 'projects.read' },
        { path: 'projects.update', data: project('user-1') },
        {
          path: 'projects.update',
          data: project('someone-else'),
        },
      ])
    ).resolves.toStrictEqual([
      { allowed: true },
      { allowed: true },
      {
        allowed: false,
        error: { code: 'forbidden', message: 'Forbidden.' },
      },
    ])
  })

  it('retrieves dehydrated state from the resolved instance', async () => {
    const adapter = createTestAdapter()

    await expect(adapter.dehydrate({ token: 'user-1' })).resolves.toStrictEqual(
      {
        projects: {
          read: true,
          update: false,
        },
      }
    )
  })

  it('keeps an explicit catalog as metadata and validates provider coverage', () => {
    const adapter = createTestAdapter({
      catalog: {
        schemaVersion: 1,
        permissions: [
          { key: 'projects.read', references: [] },
          { key: 'projects.update', references: [] },
        ],
      },
    })

    expect(adapter.catalog?.permissions).toHaveLength(2)
    expect(
      adapter.validateCoverage(['projects.read', 'projects.delete'])
    ).toStrictEqual({
      valid: false,
      unknown: ['projects.delete'],
      uncovered: ['projects.update'],
    })
    expect(createTestAdapter().validateCoverage(['projects.read'])).toBeNull()
  })
})

describe(serializeAdapterError, () => {
  it('distinguishes invalid requests, validation failures, and internal errors', async () => {
    const adapter = createTestAdapter()
    const invalidRequest = await adapter
      .checkMany({ token: 'user-1' }, [{ path: '' }] as never)
      .catch((error: unknown) => error)
    const undefinedRule = await adapter
      .check({ token: 'user-1' }, 'projects.delete' as never)
      .catch((error: unknown) => error)
    const validationFailure = new PermixValidationError('projects.update', [
      {
        message: 'Expected a project.',
        path: ['projects', Symbol('private')],
      },
    ])

    const serialized = [
      serializeAdapterError(invalidRequest),
      serializeAdapterError(undefinedRule),
      serializeAdapterError(validationFailure),
      serializeAdapterError(new Error('database credentials')),
    ]

    expect(serialized).toStrictEqual([
      {
        code: 'invalid-request',
        message: 'A check request requires a non-empty path.',
      },
      {
        code: 'invalid-request',
        message: '[Permix]: Rule "projects.delete" is not defined.',
      },
      {
        code: 'validation-failure',
        message:
          '[Permix]: Data for "projects.update" failed schema validation.',
        issues: [
          {
            message: 'Expected a project.',
            path: ['projects', 'Symbol(private)'],
          },
        ],
      },
      {
        code: 'internal-error',
        message: 'Internal error.',
      },
    ])
    expect(() => JSON.stringify(serialized)).not.toThrow()
  })

  it('serializes AdapterError issues and validation paths without keys', () => {
    expect(
      serializeAdapterError(
        new AdapterError('validation-failure', 'bad input', [
          { message: 'missing id' },
        ])
      )
    ).toStrictEqual({
      code: 'validation-failure',
      message: 'bad input',
      issues: [{ message: 'missing id' }],
    })

    expect(
      serializeAdapterError(
        new PermixValidationError('projects.read', [
          { message: 'plain' },
          { message: 'keyed', path: [{ key: 'id' }] },
        ])
      ).issues
    ).toStrictEqual([{ message: 'plain' }, { message: 'keyed', path: ['id'] }])
  })
})

describe('adapter types', () => {
  it('supports manual and generated definitions with required check data', () => {
    const manualAdapter = createTestAdapter()
    const generatedAdapter = createAdapter<
      GeneratedDefinition,
      { token: string },
      string
    >({
      authenticate: ({ token }) => token,
      resolveRules: () => ({
        tasks: {
          comment: true,
          delete: false,
          read: true,
        },
        workspace: {
          members: {
            invite: false,
          },
        },
      }),
    })

    type UpdateRequest = Extract<
      AdapterCheckRequest<TestDefinition>,
      { path: 'projects.update' }
    >

    expectTypeOf<UpdateRequest>().toEqualTypeOf<{
      readonly path: 'projects.update'
      readonly data: { id: string; ownerId: string }
    }>()
    expectTypeOf(manualAdapter.check).toBeCallableWith(
      { token: 'user-1' },
      'projects.update',
      project('user-1')
    )
    const checkWithoutRequiredData = () => {
      // @ts-expect-error projects.update requires project data
      void manualAdapter.check({ token: 'user-1' }, 'projects.update')
    }
    expectTypeOf(checkWithoutRequiredData).toBeFunction()
    expectTypeOf(generatedAdapter).toMatchTypeOf<
      PermissionAdapter<GeneratedDefinition, { token: string }, string>
    >()
  })
})

function project(ownerId: string) {
  return { id: 'project-1', ownerId }
}

function createTestAdapter(
  overrides: Partial<
    Parameters<
      typeof createAdapter<TestDefinition, { token?: string }, string>
    >[0]
  > = {}
) {
  return createAdapter<TestDefinition, { token?: string }, string>({
    authenticate: ({ token }) => token ?? null,
    resolveRules: ({ principal }) => ({
      projects: {
        read: true,
        update: ({ ownerId }) => ownerId === principal,
      },
    }),
    ...overrides,
  })
}
