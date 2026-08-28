import { describe, expect, it } from 'vitest'

import { callRuleWithoutData, createCheck, createCheckContext } from './check'
import { PermixNotReadyError, PermixRuleNotDefinedError } from './errors'

// oxlint-disable-next-line typescript/consistent-type-definitions
type PostDefinition = {
  post: ['create', 'read']
  comment: ['delete']
}

const rules = {
  post: { create: true, read: false },
  comment: { delete: true },
}

describe(callRuleWithoutData, () => {
  it('returns the boolean result of a successful rule', () => {
    expect(callRuleWithoutData(() => true)).toBe(true)
    expect(callRuleWithoutData(() => false)).toBe(false)
  })

  it('treats a thrown rule as denied', () => {
    expect(
      callRuleWithoutData(() => {
        throw new Error('missing entity')
      })
    ).toBe(false)
  })
})

describe(createCheck, () => {
  it('throws when rules are null', () => {
    const check = createCheck<PostDefinition>(null)
    expect(() => check('post.create')).toThrow(PermixNotReadyError)
  })

  it('reads rules from a getter function', () => {
    let current: typeof rules | null = null
    const check = createCheck<PostDefinition>(() => current)

    expect(() => check('post.create')).toThrow(PermixNotReadyError)
    current = rules
    expect(check('post.create')).toBe(true)
  })

  it('supports the callback form', () => {
    const check = createCheck<PostDefinition>(rules)
    expect(check((c) => c('post.create') && !c('post.read'))).toBe(true)
  })

  it('walks dotted paths and boolean leftover segments', () => {
    const check = createCheck<PostDefinition>(rules)
    expect(check('post.create')).toBe(true)
    expect(() => check('post.create.extra' as 'post.create')).toThrow(
      PermixRuleNotDefinedError
    )
  })

  it('throws when a special-symbol subtree is missing', () => {
    const check = createCheck<PostDefinition>(rules)
    expect(() => check('missing.~any' as 'post.~any')).toThrow(
      PermixRuleNotDefinedError
    )
  })

  it('stops walking when a path segment is not a string', () => {
    const check = createCheck<PostDefinition>(rules)
    expect(() =>
      (check as (...args: unknown[]) => boolean)('post', { id: '1' })
    ).toThrow(PermixRuleNotDefinedError)
  })

  it('aggregates function rules that throw when evaluating ~any', () => {
    const check = createCheck<PostDefinition>({
      post: {
        create: true,
        read: () => {
          throw new Error('needs data')
        },
      },
      comment: { delete: false },
    })

    expect(check('post.~any')).toBe(true)
    expect(check('post.~all')).toBe(false)
  })
})

describe(createCheckContext, () => {
  it('returns a null path for the callback form', () => {
    expect(
      createCheckContext<PostDefinition>((c) => c('post.read'))
    ).toStrictEqual({
      path: null,
    })
  })

  it('returns the special-symbol path', () => {
    expect(createCheckContext<PostDefinition>('post.~any')).toStrictEqual({
      path: 'post.~any',
    })
  })

  it('omits data when it is undefined', () => {
    expect(createCheckContext<PostDefinition>('post.read')).toStrictEqual({
      path: 'post.read',
    })
  })

  it('includes check data when provided', () => {
    expect(
      createCheckContext<{ post: [{ name: 'update'; type: { id: string } }] }>(
        'post.update',
        { id: '1' }
      )
    ).toStrictEqual({
      path: 'post.update',
      data: { id: '1' },
    })
  })
})
