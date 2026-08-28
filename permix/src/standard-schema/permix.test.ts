import * as v from 'valibot'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { z } from 'zod'

import { PermixRuleNotDefinedError } from '../core/errors'
import {
  PermixInvalidActionsError,
  PermixInvalidSchemaMapError,
} from './errors'
import { createPermix, entity } from './permix'

const postSchema = z.object({
  id: z.string(),
  authorId: z.string(),
})

const commentSchema = z.object({
  id: z.string(),
  postId: z.string(),
})

const valibotPostSchema = v.object({
  id: v.string(),
  authorId: v.string(),
})

describe('standard-schema createPermix', () => {
  it('creates CRUD entities from a Zod schema map', () => {
    const permix = createPermix({
      post: postSchema,
      comment: commentSchema,
    })

    expect(permix.entities).toStrictEqual(['post', 'comment'])
    expect(permix.actions).toStrictEqual(['create', 'read', 'update', 'delete'])

    permix.setup({
      post: {
        create: true,
        read: true,
        update: (post) => {
          expectTypeOf(post).toEqualTypeOf<
            { id: string; authorId: string } | undefined
          >()
          return post?.authorId === '1'
        },
        delete: false,
      },
      comment: {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
    })

    expect(permix.check('post.create')).toBe(true)
    expect(permix.check('post.delete')).toBe(false)
    expect(permix.check('post.update', { id: 'p1', authorId: '1' })).toBe(true)
    expect(permix.check('post.update', { id: 'p1', authorId: '2' })).toBe(false)
    expect(permix.check('comment.read')).toBe(true)
  })

  it('supports a custom action set via the actions option', () => {
    const permix = createPermix(
      { post: postSchema },
      { actions: ['view', 'edit'] }
    )

    expect(permix.actions).toStrictEqual(['view', 'edit'])

    permix.setup({
      post: { view: true, edit: false },
    })

    expect(permix.check('post.view')).toBe(true)
    expect(permix.check('post.edit')).toBe(false)
    // @ts-expect-error 'create' is not in the custom action set
    expect(() => permix.check('post.create')).toThrow(PermixRuleNotDefinedError)
  })

  it('lets entity() customise actions and require data per action', () => {
    const permix = createPermix({
      post: entity(postSchema, [
        'create',
        'read',
        { name: 'publish', required: true },
      ]),
      dashboard: ['view'] as const,
    })

    permix.setup({
      post: {
        create: true,
        read: true,
        publish: (post) => post.authorId === '1',
      },
      dashboard: { view: true },
    })

    expect(permix.check('post.create')).toBe(true)
    expect(permix.check('dashboard.view')).toBe(true)
    expect(permix.check('post.publish', { id: 'p1', authorId: '1' })).toBe(true)
    // @ts-expect-error data is required
    expect(() => permix.check('post.publish')).toThrow()
    // @ts-expect-error untyped action list has no entity data
    expect(permix.check('dashboard.view', { id: 'x' })).toBe(true)
  })

  it('accepts Valibot schemas in the map', () => {
    const permix = createPermix({ post: valibotPostSchema })

    permix.setup({
      post: {
        create: true,
        read: true,
        update: (post) => post?.authorId === '1',
        delete: false,
      },
    })

    expect(permix.check('post.update', { id: 'p1', authorId: '1' })).toBe(true)
  })

  it('throws when actions is an empty array', () => {
    expect(() => createPermix({ post: postSchema }, { actions: [] })).toThrow(
      PermixInvalidActionsError
    )
  })

  it('throws when entity() is given an empty action list', () => {
    expect(() => entity(postSchema, [])).toThrow(PermixInvalidActionsError)
  })

  it('throws when a map value is not a schema, entity(), or action tuple', () => {
    expect(() =>
      createPermix({
        post: postSchema,
        bad: { hello: true },
      } as never)
    ).toThrow(PermixInvalidSchemaMapError)
  })

  it('exposes entity and action types', () => {
    const permix = createPermix({ post: postSchema, comment: commentSchema })

    expectTypeOf(permix.entities).toEqualTypeOf<('post' | 'comment')[]>()
    expectTypeOf(permix.actions).toEqualTypeOf<
      readonly ['create', 'read', 'update', 'delete']
    >()
    expectTypeOf(permix.validate).toEqualTypeOf<false | 'deny' | 'throw'>()
    expect(permix.validate).toBe(false)
  })

  it('records the validate option on the instance', () => {
    const permix = createPermix({ post: postSchema }, { validate: 'deny' })
    expect(permix.validate).toBe('deny')
  })

  it('fires the check hook with allowed false when validate deny rejects data', () => {
    const permix = createPermix({ post: postSchema }, { validate: 'deny' })
    permix.setup({
      post: {
        create: true,
        read: true,
        update: true,
        delete: false,
      },
    })

    const onCheck = vi.fn()
    permix.hook('check', onCheck)

    expect(permix.check('post.update', { id: 1 } as never)).toBe(false)
    expect(onCheck).toHaveBeenCalledOnce()
    expect(onCheck).toHaveBeenCalledWith({
      path: 'post.update',
      data: { id: 1 },
      allowed: false,
      reasons: [],
    })
  })

  it('denies explain() when validate deny rejects data', () => {
    const permix = createPermix({ post: postSchema }, { validate: 'deny' })
    permix.setup({
      post: {
        create: true,
        read: true,
        update: true,
        delete: false,
      },
    })

    expect(permix.explain('post.update', { id: 1 } as never)).toStrictEqual({
      allowed: false,
      path: 'post.update',
      reasons: [],
    })
  })
})
