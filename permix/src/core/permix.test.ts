import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import {
  PermixForbiddenError,
  PermixNotReadyError,
  PermixRuleNotDefinedError,
} from './errors'
import { createPermix } from './permix'

describe(createPermix, () => {
  it('should init basic rules', () => {
    const permix = createPermix<['read']>().setup({
      read: true,
    })

    expect(permix.check('read')).toBe(true)
  })

  it('should throw if check is called before setup', () => {
    const permix = createPermix<{ post: ['create'] }>()

    expect(() => permix.check('post.create')).toThrow(PermixNotReadyError)
  })

  it('should throw if rule is not defined', () => {
    const permix = createPermix<{ post: ['create', 'read'] }>().setup({
      post: {
        create: true,
        read: true,
      },
    })

    expect(permix.check('post.read')).toBe(true)
    // @ts-expect-error rule is not defined
    expect(() => permix.check('post.not-exist')).toThrow(
      PermixRuleNotDefinedError
    )
  })

  it('should throw when check path is deeper than a boolean leaf (setup)', () => {
    const permix = createPermix<{ post: ['create', 'read'] }>().setup({
      post: true,
    } as never)

    expect(() => permix.check('post.create')).toThrow(
      expect.objectContaining({
        path: 'post.create',
        name: 'PermixRuleNotDefinedError',
      })
    )
  })

  it('should throw when check path is deeper than a boolean leaf (hydrate)', () => {
    const permix = createPermix<{ post: ['create', 'read'] }>().hydrate({
      // @ts-expect-error true is not a valid rule
      post: true,
    })

    expect(() => permix.check('post.create')).toThrow(
      expect.objectContaining({
        path: 'post.create',
        name: 'PermixRuleNotDefinedError',
      })
    )
  })

  it('should allow check on a flat boolean leaf without extra path segments', () => {
    const permix = createPermix<['read']>().setup({ read: true })

    expect(permix.check('read')).toBe(true)
  })

  it('should tolerate explicit undefined data at runtime even though it is a type error', () => {
    const permix = createPermix<{ post: ['create'] }>().setup({
      post: { create: true },
    })

    // @ts-expect-error undefined is not a valid data argument
    expect(permix.check('post.create', undefined)).toBe(true)
  })

  it('should validate permission for entity with data callback', () => {
    interface Post {
      authorId: string
    }

    const permix = createPermix<{
      post: ['read', { name: 'create'; type: Post }]
    }>().setup({
      post: {
        read: true,
        create: (post) => post?.authorId === '1',
      },
    })

    expect(permix.check('post.create', { authorId: '1' })).toBe(true)
    expect(permix.check('post.create', { authorId: '2' })).toBe(false)
    expect(permix.check('post.create')).toBe(false)
  })

  it('should require data argument when action declares required: true', () => {
    interface Post {
      authorId: string
    }

    const permix = createPermix<{
      post: [{ name: 'create'; type: Post; required: true }]
    }>().setup({
      post: {
        create: (post) => post.authorId === '1',
      },
    })

    // @ts-expect-error data is required
    expect(() => permix.check('post.create')).toThrow()
    expect(permix.check('post.create', { authorId: '1' })).toBe(true)
    expect(permix.check('post.create', { authorId: '2' })).toBe(false)
  })

  it('should work without a per-action data type', () => {
    const permix = createPermix<{
      post: ['create']
    }>().setup({
      post: { create: true },
    })

    expect(permix.check('post.create')).toBe(true)
  })

  it('should work with enum-like permissions', () => {
    const PostAction = {
      Create: 'create',
      Read: 'read',
      Update: 'update',
      Delete: 'delete',
    } as const

    type PostActionName = (typeof PostAction)[keyof typeof PostAction]

    const permix = createPermix<{
      post: [PostActionName]
    }>().setup({
      post: {
        [PostAction.Create]: true,
        [PostAction.Read]: true,
        [PostAction.Update]: true,
        [PostAction.Delete]: false,
      },
    })

    expect(permix.check(`post.${PostAction.Create}`)).toBe(true)
    expect(permix.check(`post.${PostAction.Read}`)).toBe(true)
    expect(permix.check(`post.${PostAction.Update}`)).toBe(true)
    expect(permix.check(`post.${PostAction.Delete}`)).toBe(false)
  })

  it('should expose type-only $inferDefinition and $inferPath helpers', () => {
    const permix = createPermix<{
      user: ['create']
      job: ['remove']
    }>()

    expectTypeOf(permix.$inferDefinition).toEqualTypeOf<{
      user: ['create']
      job: ['remove']
    }>()

    const ONE_PATH: typeof permix.$inferPath = 'user.create'
    expect(ONE_PATH).toBe('user.create')

    const AVAILABLE_PERMISSIONS = [
      'user.create',
      'job.remove',
    ] satisfies (typeof permix.$inferPath)[]
    expect(AVAILABLE_PERMISSIONS).toStrictEqual(['user.create', 'job.remove'])

    // @ts-expect-error 'user.unknown' is not a valid permission path
    const _INVALID = ['user.unknown'] satisfies (typeof permix.$inferPath)[]
  })

  it('should resolve permissions once setup runs asynchronously', async () => {
    const factory = createPermix<{
      post: ['create']
    }>()

    const permix = await new Promise<typeof factory>((resolve) => {
      setTimeout(() => {
        resolve(factory.setup({ post: { create: true } }))
      }, 10)
    })

    await permix.isReadyAsync()
    expect(permix.check('post.create')).toBe(true)
  })
})

describe('check ~all / ~any', () => {
  it('should return true with ~all when every rule is true', () => {
    const permix = createPermix<{
      post: ['create', 'read']
      comment: ['create', 'read', 'update']
    }>().setup({
      post: { create: true, read: true },
      comment: { create: true, read: true, update: true },
    })

    expect(permix.check('~all')).toBe(true)
  })

  it('should return false with ~all when at least one rule is false', () => {
    const permix = createPermix<{
      post: ['create', 'read']
      comment: ['create', 'read', 'update']
    }>().setup({
      post: { create: true, read: false },
      comment: { create: true, read: true, update: true },
    })

    expect(permix.check('~all')).toBe(false)
  })

  it('should return true with ~any when at least one rule is true', () => {
    const permix = createPermix<{
      post: ['create', 'read']
      comment: ['create', 'read', 'update']
    }>().setup({
      post: { create: false, read: false },
      comment: { create: false, read: true, update: false },
    })

    expect(permix.check('~any')).toBe(true)
  })

  it('should return false with ~any when every rule is false', () => {
    const permix = createPermix<{
      post: ['create', 'read']
      comment: ['create', 'read', 'update']
    }>().setup({
      post: { create: false, read: false },
      comment: { create: false, read: false, update: false },
    })

    expect(permix.check('~any')).toBe(false)
  })

  it('should evaluate function rules with no data when aggregating', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>().setup({
      post: {
        create: () => true,
        read: () => false,
      },
    })

    expect(permix.check('~any')).toBe(true)
    expect(permix.check('~all')).toBe(false)
  })

  it('should aggregate only the leaf subtree with `<path>.~all` / `<path>.~any`', () => {
    const permix = createPermix<{
      post: ['create', 'read']
      comment: ['create', 'read', 'update']
    }>().setup({
      post: { create: true, read: true },
      comment: { create: false, read: true, update: false },
    })

    expect(permix.check('post.~any')).toBe(true)
    expect(permix.check('post.~all')).toBe(true)
    expect(permix.check('comment.~all')).toBe(false)
    expect(permix.check('comment.~any')).toBe(true)
  })

  it('should aggregate a nested non-leaf subtree with `<path>.~all` / `<path>.~any`', () => {
    const permix = createPermix<{
      user: ['write']
      workspace: {
        customer: ['create', 'delete']
        guest: ['read', 'write']
      }
    }>().setup({
      user: { write: true },
      workspace: {
        customer: { create: true, delete: true },
        guest: { read: true, write: false },
      },
    })

    expect(permix.check('workspace.~all')).toBe(false)
    expect(permix.check('workspace.~any')).toBe(true)
    expect(permix.check('workspace.customer.~all')).toBe(true)
    expect(permix.check('workspace.guest.~all')).toBe(false)
    expect(permix.check('workspace.guest.~any')).toBe(true)
  })

  it('should resolve function rules when aggregating a nested subtree', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>().setup({
      post: {
        create: () => true,
        read: () => false,
      },
    })

    expect(permix.check('post.~any')).toBe(true)
    expect(permix.check('post.~all')).toBe(false)
  })

  it('should deny empty-subtree ~all instead of vacuously allowing', () => {
    const permix = createPermix<{
      post: ['create']
    }>().setup({} as never)
    expect(permix.check('~all')).toBe(false)
    expect(permix.check('~any')).toBe(false)
  })

  it('should deny ~all on an empty nested subtree', () => {
    const permix = createPermix<{
      post: ['create']
    }>().setup({ post: {} } as never)
    expect(permix.check('post.~all')).toBe(false)
    expect(permix.check('post.~any')).toBe(false)
  })

  it('should treat entity-required throws as deny under ~any / ~all', () => {
    const permix = createPermix<{
      post: [{ name: 'edit'; type: { id: string }; required: true }]
    }>().setup({
      post: {
        edit: (data) => data.id === '1',
      },
    })

    expect(permix.check('~any')).toBe(false)
    expect(permix.check('~all')).toBe(false)
    expect(permix.check('post.~any')).toBe(false)
    expect(permix.check('post.~all')).toBe(false)
  })
})

describe('deep rules', () => {
  it('should init deep rules', () => {
    const permix = createPermix<{
      user: ['write']
      workspace: {
        customer: ['write']
        guest: ['write']
      }
    }>().setup({
      user: {
        write: true,
      },
      workspace: {
        customer: {
          write: true,
        },
        guest: {
          write: false,
        },
      },
    })

    expect(permix.check('user.write')).toBe(true)
    expect(permix.check('workspace.customer.write')).toBe(true)
  })

  it('should work with callback and per-action data', () => {
    const permix = createPermix<{
      user: [
        'read',
        { name: 'write'; type: { authorId: string }; required: true },
      ]
      workspace: {
        customer: ['write']
        guest: ['write']
      }
    }>().setup({
      user: {
        read: true,
        write: (data) => data.authorId === '1',
      },
      workspace: {
        customer: {
          write: true,
        },
        guest: {
          write: false,
        },
      },
    })

    expect(permix.check('user.read')).toBe(true)
    expect(permix.check('user.write', { authorId: '1' })).toBe(true)
    expect(permix.check('user.write', { authorId: '2' })).toBe(false)
    expect(permix.check((c) => c('user.read'))).toBe(true)
    expect(
      permix.check((c) => c('user.read') && c('user.write', { authorId: '1' }))
    ).toBe(true)
    expect(permix.check((c) => c('user.write', { authorId: '1' }))).toBe(true)
    expect(permix.check((c) => c('user.write', { authorId: '2' }))).toBe(false)
    expect(permix.check((c) => c('workspace.customer.write'))).toBe(true)
  })

  describe('hydration', () => {
    it('should hydrate permissions from JSON state', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>().hydrate({
        post: {
          create: true,
          read: false,
        },
      })

      expect(permix.check('post.create')).toBe(true)
      expect(permix.check('post.read')).toBe(false)
    })

    it('should handle nested entities', () => {
      const permix = createPermix<{
        post: ['create', 'read', 'update']
        comment: ['write', 'delete']
      }>().hydrate({
        post: {
          create: true,
          read: true,
          update: false,
        },
        comment: {
          write: true,
          delete: false,
        },
      })

      expect(permix.check('post.create')).toBe(true)
      expect(permix.check('post.update')).toBe(false)
      expect(permix.check('comment.write')).toBe(true)
      expect(permix.check('comment.delete')).toBe(false)
    })

    it('should dehydrate permissions to JSON state', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>().setup({
        post: {
          create: true,
          read: false,
        },
      })

      const dehydratedState = permix.dehydrate()

      expect(dehydratedState).toStrictEqual({
        post: {
          create: true,
          read: false,
        },
      })

      const hydrated = permix.hydrate(dehydratedState)

      expect(hydrated.check('post.create')).toBe(true)
      expect(hydrated.check('post.read')).toBe(false)
    })

    it('should evaluate function rules when dehydrating', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>().setup({
        post: {
          create: () => true,
          read: () => false,
        },
      })

      const dehydrated = permix.dehydrate()
      expect(dehydrated).toStrictEqual({ post: { create: true, read: false } })

      const hydrated = permix.hydrate(dehydrated)
      expect(hydrated.check('post.create')).toBe(true)
      expect(hydrated.check('post.read')).toBe(false)
    })

    it('should evaluate data rules without check data when dehydrating', () => {
      const permix = createPermix<{
        user: [{ name: 'write'; type: { authorId: string }; required: true }]
      }>().setup({
        user: {
          write: (data) => data.authorId === '1',
        },
      })

      expect(permix.dehydrate()).toStrictEqual({ user: { write: false } })
    })

    it('should throw when dehydrating without setup', () => {
      const permix = createPermix<{
        post: ['create']
      }>()

      expect(() => permix.dehydrate()).toThrow(PermixNotReadyError)
    })

    it('should transfer state from server to client instance', () => {
      const permixServer = createPermix<{
        post: ['create', 'read']
      }>().setup({
        post: {
          create: true,
          read: false,
        },
      })

      const dehydrated = permixServer.dehydrate()
      const permixClient = createPermix<{
        post: ['create', 'read']
      }>().hydrate(dehydrated)

      expect(permixClient.check('post.create')).toBe(true)
      expect(permixClient.check('post.read')).toBe(false)
    })

    it('should dehydrate deep nested rules', () => {
      const permix = createPermix<{
        workspace: {
          guest: ['write']
          user: ['write2']
        }
      }>().setup({
        workspace: {
          guest: { write: false },
          user: { write2: true },
        },
      })

      expect(permix.dehydrate()).toStrictEqual({
        workspace: {
          guest: { write: false },
          user: { write2: true },
        },
      })
    })
  })

  describe('template', () => {
    it('should define static permissions with template', () => {
      const factory = createPermix<{
        post: ['create', 'read']
        comment: ['create', 'read', 'update']
      }>()

      const adminPermissions = factory.template({
        post: {
          create: true,
          read: true,
        },
        comment: {
          create: true,
          read: true,
          update: true,
        },
      })

      expect(adminPermissions()).toStrictEqual({
        post: { create: true, read: true },
        comment: { create: true, read: true, update: true },
      })

      const permix = factory.setup(adminPermissions())
      expect(permix.check('post.create')).toBe(true)
    })

    it('should work with dynamic template function', () => {
      const factory = createPermix<{
        post: ['create', 'read']
      }>()

      const rolePermissions = factory.template(
        ({ role }: { role: string }) => ({
          post: {
            create: role === 'admin',
            read: true,
          },
        })
      )

      const admin = factory.setup(rolePermissions({ role: 'admin' }))
      expect(admin.check('post.create')).toBe(true)

      const viewer = factory.setup(rolePermissions({ role: 'viewer' }))
      expect(viewer.check('post.create')).toBe(false)
      expect(viewer.check('post.read')).toBe(true)
    })
  })

  describe('hooks', () => {
    it('should call setup hook every time setup is called', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>()

      const fn = vi.fn()
      permix.hook('setup', fn)

      permix.setup({ post: { create: true, read: true } })
      permix.setup({ post: { create: false, read: true } })

      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should call hookOnce only once', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>()

      const fn = vi.fn()
      permix.hookOnce('setup', fn)

      permix.setup({ post: { create: true, read: true } })
      permix.setup({ post: { create: false, read: true } })

      expect(fn).toHaveBeenCalledOnce()
    })

    it('should fire ready on every setup with the new instance', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>()

      const fn = vi.fn()
      permix.hook('ready', fn)

      permix.setup({ post: { create: true, read: true } })
      permix.setup({ post: { create: false, read: true } })

      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should ignore reserved hydrate keys and keep own denies', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>()
        .setup({
          post: { create: false, read: false },
        })
        .hydrate(
          JSON.parse(
            '{"post":{"__proto__":{"create":true},"read":false}}'
          ) as never
        )

      expect(() => permix.check('post.create')).toThrow(
        PermixRuleNotDefinedError
      )
      expect(permix.check('post.read')).toBe(false)
    })

    it('should not become ready on hydrate, only on setup', () => {
      const factory = createPermix<{
        post: ['create', 'read']
      }>()

      const fn = vi.fn()
      factory.hook('ready', fn)

      const hydrated = factory.hydrate({ post: { create: true, read: false } })

      expect(fn).toHaveBeenCalledTimes(0)
      expect(hydrated.isReady()).toBe(false)
      expect(factory.isReady()).toBe(false)
      // check still works with hydrated booleans even though not ready
      expect(hydrated.check('post.create')).toBe(true)

      const ready = factory.setup({ post: { create: true, read: false } })

      expect(fn).toHaveBeenCalledOnce()
      expect(ready.isReady()).toBe(true)
    })

    it('should return removal function from hook', () => {
      const permix = createPermix<{
        post: ['create']
      }>()

      const fn = vi.fn()
      const remove = permix.hook('setup', fn)

      permix.setup({ post: { create: true } })
      expect(fn).toHaveBeenCalledOnce()

      remove()
      permix.setup({ post: { create: false } })
      expect(fn).toHaveBeenCalledOnce()
    })

    it('should report isReady correctly', () => {
      const factory = createPermix<{
        post: ['create']
      }>()

      expect(factory.isReady()).toBe(false)
      const permix = factory.setup({ post: { create: true } })
      expect(permix.isReady()).toBe(true)
      expect(factory.isReady()).toBe(false)
    })

    it('should call check hook with path and data', () => {
      const permix = createPermix<{
        post: [
          'create',
          { name: 'edit'; type: { authorId: string }; required: true },
        ]
      }>().setup({
        post: { create: true, edit: (post) => post.authorId === '1' },
      })

      const fn = vi.fn()
      permix.hook('check', fn)

      permix.check('post.create')
      expect(fn).toHaveBeenCalledWith({
        path: 'post.create',
        allowed: true,
        reasons: [],
      })

      permix.check('post.edit', { authorId: '1' })
      expect(fn).toHaveBeenCalledWith({
        path: 'post.edit',
        data: { authorId: '1' },
        allowed: true,
        reasons: [],
      })
    })

    it('should call check hook with null path for callback form', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>().setup({ post: { create: true, read: false } })

      const fn = vi.fn()
      permix.hook('check', fn)

      permix.check((c) => c('post.create') && c('post.read'))
      expect(fn).toHaveBeenCalledWith({
        path: null,
        allowed: false,
        reasons: [],
      })
    })

    it('should resolve isReadyAsync immediately if already ready', async () => {
      const permix = createPermix<{
        post: ['create']
      }>({ post: { create: true } })

      await expect(permix.isReadyAsync()).resolves.toBeUndefined()
    })

    it('should resolve isReadyAsync on the instance returned from setup', async () => {
      const factory = createPermix<{
        post: ['create']
      }>()

      const permix = factory.setup({ post: { create: true } })

      await expect(permix.isReadyAsync()).resolves.toBeUndefined()
    })
  })
})

describe('explain', () => {
  it('should keep check() as a boolean when a rule returns a decision', () => {
    const permix = createPermix<{
      post: ['create']
    }>().setup({
      post: {
        create: () => ({ allow: false, reason: 'not an author' }),
      },
    })

    expect(permix.check('post.create')).toBe(false)
  })

  it('should return the denial reason from a closure', () => {
    const permix = createPermix<{
      post: ['create']
    }>().setup({
      post: {
        create: () => ({ allow: false, reason: 'not an author' }),
      },
    })

    expect(permix.explain('post.create')).toStrictEqual({
      allowed: false,
      path: 'post.create',
      reasons: ['not an author'],
    })
  })

  it('should fire the check hook with reasons after eval', () => {
    const permix = createPermix<{
      post: ['create']
    }>().setup({
      post: {
        create: () => ({ allow: false, reason: 'not an author' }),
      },
    })

    const fn = vi.fn()
    permix.hook('check', fn)

    expect(permix.check('post.create')).toBe(false)
    expect(fn).toHaveBeenCalledWith({
      path: 'post.create',
      allowed: false,
      reasons: ['not an author'],
    })
  })

  it('should aggregate denial reasons for ~all', () => {
    const permix = createPermix<{
      post: ['create', 'read', 'delete']
    }>().setup({
      post: {
        create: () => ({ allow: false, reason: 'cannot create' }),
        read: true,
        delete: () => ({ allow: false, reason: 'cannot delete' }),
      },
    })

    expect(permix.check('post.~all')).toBe(false)
    expect(permix.explain('post.~all')).toStrictEqual({
      allowed: false,
      path: 'post.~all',
      reasons: ['cannot create', 'cannot delete'],
    })
  })

  it('should dehydrate function decisions to booleans without reasons', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>().setup({
      post: {
        create: () => ({ allow: true, reason: 'ok' }),
        read: () => ({ allow: false, reason: 'nope' }),
      },
    })

    expect(permix.dehydrate()).toStrictEqual({
      post: { create: true, read: false },
    })
  })

  it('should attach path and reasons on PermixForbiddenError', () => {
    const error = new PermixForbiddenError({
      path: 'post.create',
      reasons: ['not an author'],
    })

    expect(error.path).toBe('post.create')
    expect(error.reasons).toStrictEqual(['not an author'])
  })
})

describe('frozen rules', () => {
  it('should ignore mutation of the object passed to setup', () => {
    const rules = {
      post: { create: false, read: false },
    }
    const permix = createPermix<{
      post: ['create', 'read']
    }>().setup(rules)
    rules.post.create = true

    expect(permix.check('post.create')).toBe(false)
  })

  it('should ignore mutation of getRules()', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>().setup({
      post: { create: false, read: false },
    })

    const live = permix.getRules()
    expect(live).not.toBeNull()
    expect(() => {
      live!.post.create = true
    }).toThrow()
    expect(permix.check('post.create')).toBe(false)
  })
})

describe('overlapping setup is isolated', () => {
  it('does not leak overlapping setup() into an earlier instance', async () => {
    const factory = createPermix<{ post: ['create'] }>()
    const a = factory.setup({ post: { create: true } })
    const pending = Promise.resolve().then(() => a.check('post.create'))
    factory.setup({ post: { create: false } })
    await expect(pending).resolves.toBe(true)
    expect(a.check('post.create')).toBe(true)
  })
})
