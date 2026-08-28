import { afterEach, describe, expect, it, vi } from 'vitest'

import { createPermix } from './permix'
import { resetRequestCache } from './request-cache-mock'

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  const { createRequestScopedCache } = await import('./request-cache-mock')
  return {
    ...actual,
    cache: createRequestScopedCache,
    use: <T>(usable: T | PromiseLike<T>): T => {
      if (
        usable !== null &&
        usable !== undefined &&
        typeof (usable as PromiseLike<T>).then === 'function'
      ) {
        const thenable = usable as PromiseLike<T> & {
          status?: 'fulfilled' | 'rejected' | 'pending'
          value?: T
          reason?: unknown
        }
        if (thenable.status === 'fulfilled') {
          return thenable.value as T
        }
        if (thenable.status === 'rejected') {
          throw thenable.reason
        }
        throw thenable
      }
      return usable as T
    },
  }
})

describe('next createPermix', () => {
  afterEach(() => {
    resetRequestCache()
  })

  it('initializes from a sync resolver and checks permissions', async () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>(() => ({
      post: {
        create: true,
        read: false,
      },
    }))

    await expect(permix.check('post.create')).resolves.toBe(true)
    await expect(permix.check('post.read')).resolves.toBe(false)
  })

  it('initializes from an async resolver', async () => {
    const permix = createPermix<{
      post: ['create']
    }>(async () => {
      const user = await Promise.resolve({ role: 'admin' as const })
      return {
        post: {
          create: user.role === 'admin',
        },
      }
    })

    await expect(permix.check('post.create')).resolves.toBe(true)
  })

  it('returns the initialized core instance from getPermix', async () => {
    const permix = createPermix<{
      post: ['create']
    }>(() => ({ post: { create: true } }))

    const core = await permix.getPermix()

    expect(core.isReady()).toBe(true)
    expect(core.check('post.create')).toBe(true)
  })

  it('reads the current rules with getRules', async () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>(() => ({
      post: {
        create: true,
        read: false,
      },
    }))

    // Frozen rules use a null prototype, so toStrictEqual would fail on constructor.
    // oxlint-disable-next-line vitest/prefer-strict-equal
    await expect(permix.getRules()).resolves.toEqual({
      post: {
        create: true,
        read: false,
      },
    })
  })

  it('dehydrates the request-scoped state', async () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>(() => ({
      post: {
        create: true,
        read: false,
      },
    }))

    await expect(permix.dehydrate()).resolves.toStrictEqual({
      post: {
        create: true,
        read: false,
      },
    })
  })

  it('shares one initialized instance across concurrent callers', async () => {
    let calls = 0
    const permix = createPermix<{
      post: ['create']
    }>(async () => {
      calls++
      await Promise.resolve()
      return { post: { create: true } }
    })

    const [first, second, allowed] = await Promise.all([
      permix.getPermix(),
      permix.getPermix(),
      permix.check('post.create'),
    ])

    expect(calls).toBe(1)
    expect(first).toBe(second)
    expect(allowed).toBe(true)
    expect(first.check('post.create')).toBe(true)
  })

  it('isolates state between independent factories', async () => {
    const permixA = createPermix<{ post: ['create'] }>(() => ({
      post: { create: true },
    }))
    const permixB = createPermix<{ post: ['create'] }>(() => ({
      post: { create: false },
    }))

    await expect(permixA.check('post.create')).resolves.toBe(true)
    await expect(permixB.check('post.create')).resolves.toBe(false)
    const [coreA, coreB] = await Promise.all([
      permixA.getPermix(),
      permixB.getPermix(),
    ])
    expect(coreA).not.toBe(coreB)
  })

  it('isolates state across simulated requests of the same factory', async () => {
    let requestRole: 'admin' | 'guest' = 'admin'
    const permix = createPermix<{ post: ['create'] }>(() => ({
      post: { create: requestRole === 'admin' },
    }))

    await expect(permix.check('post.create')).resolves.toBe(true)
    const first = await permix.getPermix()

    resetRequestCache()
    requestRole = 'guest'

    await expect(permix.check('post.create')).resolves.toBe(false)
    await expect(permix.getPermix()).resolves.not.toBe(first)
  })

  it('usePermix unwraps the same initialized instance', async () => {
    const permix = createPermix<{
      post: ['create']
    }>(() => ({ post: { create: true } }))

    const instancePromise = permix.getPermix()
    const instance = await instancePromise
    Object.assign(instancePromise, {
      status: 'fulfilled',
      value: instance,
    })

    expect(permix.usePermix()).toBe(instance)
    expect(instance.check('post.create')).toBe(true)
  })

  it('creates reusable templates without waiting on initialization', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>(() => ({
      post: {
        create: false,
        read: false,
      },
    }))

    const adminTemplate = permix.template({
      post: {
        create: true,
        read: true,
      },
    })

    expect(adminTemplate()).toStrictEqual({
      post: {
        create: true,
        read: true,
      },
    })
  })

  it('supports parameterized templates', () => {
    const permix = createPermix<{
      post: [{ name: 'edit'; type: { authorId: string } }]
    }>(() => ({
      post: {
        edit: () => false,
      },
    }))

    const template = permix.template((userId: string) => ({
      post: {
        edit: (post: { authorId: string } | undefined) =>
          post?.authorId === userId,
      },
    }))

    const rules = template('user-1')
    const editFn = rules.post.edit as (
      post: { authorId: string } | undefined
    ) => boolean

    expect(editFn({ authorId: 'user-1' })).toBe(true)
    expect(editFn({ authorId: 'user-2' })).toBe(false)
  })
})
