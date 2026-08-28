import * as v from 'valibot'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { createPermix } from './permix'
import { action } from './standard-schema'

const postSchema = z.object({
  id: z.string(),
  authorId: z.string(),
})

const valibotPostSchema = v.object({
  id: v.string(),
  authorId: v.string(),
})

describe('ActionSpec.schema', () => {
  it('infers entity data from a Zod schema on the action spec', () => {
    const permix = createPermix<{
      post: [
        'create',
        { name: 'edit'; schema: typeof postSchema; required: true },
      ]
    }>()

    permix.setup({
      post: {
        create: true,
        edit: (post) => {
          expectTypeOf(post).toEqualTypeOf<{ id: string; authorId: string }>()
          return post.authorId === '1'
        },
      },
    })

    expectTypeOf(permix.check)
      .parameter(0)
      .extract<'post.edit'>()
      .toEqualTypeOf<'post.edit'>()

    expect(permix.check('post.edit', { id: 'p1', authorId: '1' })).toBe(true)
    expect(permix.check('post.edit', { id: 'p1', authorId: '2' })).toBe(false)
    // @ts-expect-error data is required
    expect(() => permix.check('post.edit')).toThrow()
  })

  it('lets type override schema when both are set', () => {
    const permix = createPermix<{
      post: [
        {
          name: 'edit'
          schema: typeof postSchema
          type: { ownerId: string }
          required: true
        },
      ]
    }>()

    permix.setup({
      post: {
        edit: (post) => post.ownerId === '1',
      },
    })

    expect(permix.check('post.edit', { ownerId: '1' })).toBe(true)
    expect(permix.check('post.edit', { ownerId: '2' })).toBe(false)
  })

  it('does not parse check data at runtime', () => {
    const permix = createPermix<{
      post: [{ name: 'edit'; schema: typeof postSchema }]
    }>()

    permix.setup({
      post: {
        edit: (post) => post?.authorId === '1',
      },
    })

    expect(
      permix.check('post.edit', {
        id: 'p1',
        authorId: '1',
        extra: true,
      } as { id: string; authorId: string })
    ).toBe(true)
  })
})

describe('action()', () => {
  it('builds a definition whose schema types flow into check and setup', () => {
    const definition = {
      post: ['create', action('edit', postSchema, { required: true })],
    } as const

    const permix = createPermix<typeof definition>()

    permix.setup({
      post: {
        create: true,
        edit: (post) => post.authorId === '1',
      },
    })

    expect(permix.check('post.create')).toBe(true)
    expect(permix.check('post.edit', { id: 'p1', authorId: '1' })).toBe(true)
    expect(permix.check('post.edit', { id: 'p1', authorId: '2' })).toBe(false)
    // @ts-expect-error data is required
    expect(() => permix.check('post.edit')).toThrow()
  })

  it('keeps check data optional when required is omitted', () => {
    const definition = {
      post: [action('edit', postSchema)],
    } as const

    const permix = createPermix<typeof definition>()

    permix.setup({
      post: {
        edit: (post) => post?.authorId === '1',
      },
    })

    expect(permix.check('post.edit')).toBe(false)
    expect(permix.check('post.edit', { id: 'p1', authorId: '1' })).toBe(true)
  })
})

describe('ActionSpec.schema with Valibot', () => {
  it('infers entity data from a Valibot schema', () => {
    const permix = createPermix<{
      post: [{ name: 'edit'; schema: typeof valibotPostSchema; required: true }]
    }>()

    permix.setup({
      post: {
        edit: (post) => {
          expectTypeOf(post).toEqualTypeOf<{ id: string; authorId: string }>()
          return post.authorId === '1'
        },
      },
    })

    expect(permix.check('post.edit', { id: 'p1', authorId: '1' })).toBe(true)
    expect(permix.check('post.edit', { id: 'p1', authorId: '2' })).toBe(false)
  })
})
