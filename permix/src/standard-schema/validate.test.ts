import { describe, expect, it } from 'vitest'

import { createCheck } from '../core/check'
import type { StandardSchemaV1 } from '../core/standard-schema'
import { PermixAsyncValidationError, PermixValidationError } from './errors'
import { checkWithValidation, prepareCheckData } from './validate'

const postSchema: StandardSchemaV1<{ id: string }, { id: string }> = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate(value) {
      if (
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        typeof value.id === 'string'
      ) {
        return { value: { id: value.id } }
      }
      return { issues: [{ message: 'invalid post' }] }
    },
  },
}

const asyncSchema: StandardSchemaV1 = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate() {
      return Promise.resolve({ value: {} })
    },
  },
}

const schemas = new Map<string, StandardSchemaV1>([['post', postSchema]])

describe(prepareCheckData, () => {
  it('skips special paths and missing data', () => {
    expect(
      prepareCheckData(schemas, 'deny', 'post.~any', { id: '1' })
    ).toBeTypeOf('symbol')
    expect(
      prepareCheckData(schemas, 'deny', 'post.read', undefined)
    ).toBeTypeOf('symbol')
  })

  it('skips entities without a schema', () => {
    expect(
      prepareCheckData(schemas, 'deny', 'comment.read', { id: '1' })
    ).toBeTypeOf('symbol')
  })

  it('throws when validation is asynchronous', () => {
    expect(() =>
      prepareCheckData(new Map([['post', asyncSchema]]), 'deny', 'post.read', {
        id: '1',
      })
    ).toThrow(PermixAsyncValidationError)
  })

  it('throws or denies when data is invalid', () => {
    expect(
      prepareCheckData(schemas, 'deny', 'post.read', { id: 1 })
    ).toBeTypeOf('symbol')
    expect(() =>
      prepareCheckData(schemas, 'throw', 'post.read', { id: 1 })
    ).toThrow(PermixValidationError)
  })

  it('returns parsed output for valid data', () => {
    expect(
      prepareCheckData(schemas, 'deny', 'post.read', { id: '1' })
    ).toStrictEqual({ id: '1' })
  })
})

describe(checkWithValidation, () => {
  const rules = {
    post: { read: true, update: (post: { id: string }) => post.id === '1' },
  }
  const check = createCheck<{
    post: ['read', { name: 'update'; type: { id: string }; required: true }]
  }>(rules)

  it('rewrites valid data before checking', () => {
    expect(
      checkWithValidation(check, schemas, 'deny', ['post.update', { id: '1' }])
    ).toBe(true)
  })

  it('denies invalid data in deny mode', () => {
    expect(
      checkWithValidation(check, schemas, 'deny', [
        'post.update',
        { id: 1 } as never,
      ])
    ).toBe(false)
  })

  it('supports the callback form', () => {
    expect(
      checkWithValidation(check, schemas, 'deny', [
        (c) => c('post.update', { id: '1' }),
      ])
    ).toBe(true)
    expect(
      checkWithValidation(check, schemas, 'deny', [
        (c) => c('post.update', { id: 1 } as never),
      ])
    ).toBe(false)
    expect(
      checkWithValidation(check, schemas, 'deny', [(c) => c('post.read')])
    ).toBe(true)
  })
})
