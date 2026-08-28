import { type } from 'arktype'
import { Schema } from 'effect'
import * as v from 'valibot'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { action, createPermix as createPermixCore } from '../core'
import type { StandardSchemaV1 } from '../core/standard-schema'
import { PermixAsyncValidationError, PermixValidationError } from './errors'
import { createPermix, entity } from './permix'

const validPost = { id: 'p1', authorId: '1' }
const otherAuthor = { id: 'p1', authorId: '2' }
const missingId = { authorId: '1' }

const zodPost = z.object({
  id: z.string(),
  authorId: z.string(),
})

const valibotPost = v.object({
  id: v.string(),
  authorId: v.string(),
})

const arktypePost = type({
  id: 'string',
  authorId: 'string',
})

const effectPost = Schema.standardSchemaV1(
  Schema.Struct({
    id: Schema.String,
    authorId: Schema.String,
  })
)

function isAuthor(post: unknown) {
  return (post as { authorId?: string } | undefined)?.authorId === '1'
}

const libraries: { name: string; schema: StandardSchemaV1 }[] = [
  { name: 'zod', schema: zodPost },
  { name: 'valibot', schema: valibotPost },
  { name: 'arktype', schema: arktypePost },
  { name: 'effect', schema: effectPost },
]

describe.each(libraries)('$name Standard Schema', ({ schema }) => {
  it('implements Standard Schema v1', () => {
    expect(schema['~standard'].version).toBe(1)
    expect(schema['~standard'].validate).toBeTypeOf('function')
  })

  it('checks valid and denied entity data via action() on core createPermix', () => {
    const definition = {
      post: [action('update', schema)],
    } as const

    const permix = createPermixCore<typeof definition>().setup({
      post: {
        update: isAuthor,
      },
    })

    expect(permix.check('post.update', validPost)).toBe(true)
    expect(permix.check('post.update', otherAuthor)).toBe(false)
  })

  it('creates a factory instance and checks valid and denied entity data', () => {
    const permix = createPermix({ post: schema }).setup({
      post: {
        create: true,
        read: true,
        update: isAuthor,
        delete: false,
      },
    })

    expect(permix.check('post.update', validPost)).toBe(true)
    expect(permix.check('post.update', otherAuthor)).toBe(false)
  })

  it('does not parse check data unless validate is set', () => {
    const permix = createPermix({ post: schema }).setup({
      post: {
        create: false,
        read: false,
        update: isAuthor,
        delete: false,
      },
    })

    expect(permix.check('post.update', missingId as never)).toBe(true)
  })

  it('validate: deny returns false for invalid data', () => {
    const permix = createPermix({ post: schema }, { validate: 'deny' }).setup({
      post: {
        create: false,
        read: false,
        update: isAuthor,
        delete: false,
      },
    })

    expect(permix.check('post.update', validPost)).toBe(true)
    expect(permix.check('post.update', missingId as never)).toBe(false)
  })

  it('validate: throw raises PermixValidationError for invalid data', () => {
    const permix = createPermix({ post: schema }, { validate: 'throw' }).setup({
      post: {
        create: false,
        read: false,
        update: isAuthor,
        delete: false,
      },
    })

    expect(permix.check('post.update', validPost)).toBe(true)
    expect(() => permix.check('post.update', missingId as never)).toThrow(
      PermixValidationError
    )
  })
})

describe('library type inference', () => {
  it('zod infers entity data from the schema output', () => {
    createPermix({ post: zodPost }).setup({
      post: {
        create: false,
        read: false,
        update: (post) => {
          expectTypeOf(post).toEqualTypeOf<
            { id: string; authorId: string } | undefined
          >()
          return true
        },
        delete: false,
      },
    })
  })

  it('valibot infers entity data from the schema output', () => {
    createPermix({ post: valibotPost }).setup({
      post: {
        create: false,
        read: false,
        update: (post) => {
          expectTypeOf(post).toEqualTypeOf<
            { id: string; authorId: string } | undefined
          >()
          return true
        },
        delete: false,
      },
    })
  })

  it('arktype infers entity data from the schema output', () => {
    createPermix({ post: arktypePost }).setup({
      post: {
        create: false,
        read: false,
        update: (post) => {
          expectTypeOf(post).toEqualTypeOf<
            { id: string; authorId: string } | undefined
          >()
          return true
        },
        delete: false,
      },
    })
  })

  it('effect infers entity data from the schema output', () => {
    createPermix({ post: effectPost }).setup({
      post: {
        create: false,
        read: false,
        update: (post) => {
          expectTypeOf(post).toEqualTypeOf<
            { readonly id: string; readonly authorId: string } | undefined
          >()
          return true
        },
        delete: false,
      },
    })
  })
})

describe('factory validate option', () => {
  it('defaults to off', () => {
    const permix = createPermix({ post: zodPost })
    expect(permix.validate).toBe(false)
  })

  it('attaches path and issues on PermixValidationError', () => {
    const schema: StandardSchemaV1 = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: () => ({ issues: [{ message: 'id required' }] }),
      },
    }

    const permix = createPermix({ post: schema }, { validate: 'throw' }).setup({
      post: {
        create: false,
        read: false,
        update: () => true,
        delete: false,
      },
    })

    expect(() => permix.check('post.update', validPost)).toThrow(
      expect.objectContaining({
        name: 'PermixValidationError',
        path: 'post.update',
        issues: [{ message: 'id required' }],
      })
    )
  })

  it('passes transformed output to the rule when validate is on', () => {
    const schema = z
      .object({
        id: z.string(),
        authorId: z.string(),
      })
      .transform((post) => ({
        ...post,
        authorId: post.authorId.toUpperCase(),
      }))

    const permix = createPermix({ post: schema }, { validate: 'deny' }).setup({
      post: {
        create: false,
        read: false,
        update: (post) => post?.authorId === 'ABC',
        delete: false,
      },
    })

    expect(permix.check('post.update', { id: 'p1', authorId: 'abc' })).toBe(
      true
    )
  })

  it('validates inside callback checks', () => {
    const permix = createPermix({ post: zodPost }, { validate: 'deny' }).setup({
      post: {
        create: false,
        read: false,
        update: (post) => post?.authorId === '1',
        delete: false,
      },
    })

    expect(
      permix.check(
        (c) =>
          c('post.update', missingId as typeof validPost) ||
          c('post.update', validPost)
      )
    ).toBe(true)

    expect(
      permix.check((c) => c('post.update', missingId as typeof validPost))
    ).toBe(false)
  })

  it('skips validation for ~any / ~all and checks without data', () => {
    const permix = createPermix({ post: zodPost }, { validate: 'throw' }).setup(
      {
        post: {
          create: true,
          read: false,
          update: (post) => post?.authorId === '1',
          delete: false,
        },
      }
    )

    expect(permix.check('post.create')).toBe(true)
    expect(permix.check('post.update')).toBe(false)
    expect(permix.check('post.~any')).toBe(true)
    expect(permix.check('~all')).toBe(false)
  })

  it('skips validation for untyped action tuples', () => {
    const permix = createPermix(
      {
        post: zodPost,
        dashboard: ['view'] as const,
      },
      { validate: 'throw' }
    ).setup({
      post: {
        create: false,
        read: false,
        update: () => true,
        delete: false,
      },
      dashboard: { view: true },
    })

    expect(permix.check('dashboard.view')).toBe(true)
  })

  it('validates entity() schemas', () => {
    const permix = createPermix(
      {
        post: entity(zodPost, ['edit'] as const),
      },
      { validate: 'deny' }
    ).setup({
      post: {
        edit: (post) => post?.authorId === '1',
      },
    })

    expect(permix.check('post.edit', validPost)).toBe(true)
    expect(permix.check('post.edit', missingId as typeof validPost)).toBe(false)
  })

  it('throws PermixAsyncValidationError when validate returns a Promise', () => {
    const asyncSchema: StandardSchemaV1 = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: () => Promise.resolve({ value: validPost }),
      },
    }

    const permix = createPermix(
      { post: asyncSchema },
      { validate: 'deny' }
    ).setup({
      post: {
        create: false,
        read: false,
        update: () => true,
        delete: false,
      },
    })

    expect(() => permix.check('post.update', validPost)).toThrow(
      PermixAsyncValidationError
    )
  })
})
