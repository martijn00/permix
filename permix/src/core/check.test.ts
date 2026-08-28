import { describe, expect, it } from 'vitest'

import { unwrapRuleResult } from './check'
import { PermixRuleNotDefinedError } from './errors'
import { createPermix } from './permix'

describe('prototype-safe check walk', () => {
  it('should throw for inherited Object.prototype names', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>()

    permix.setup({
      post: { create: false, read: false },
    })

    const check = permix.check as (path: string) => boolean

    expect(() => check('post.toString')).toThrow(PermixRuleNotDefinedError)
    expect(() => check('post.valueOf')).toThrow(PermixRuleNotDefinedError)
    expect(() => check('post.constructor')).toThrow(PermixRuleNotDefinedError)
    expect(permix.check('post.create')).toBe(false)
  })
})

describe(unwrapRuleResult, () => {
  it('keeps booleans as allowed with no reasons', () => {
    expect(unwrapRuleResult(true)).toStrictEqual({
      allowed: true,
      reasons: [],
    })
    expect(unwrapRuleResult(false)).toStrictEqual({
      allowed: false,
      reasons: [],
    })
  })

  it('keeps a denial reason and drops reasons on allow', () => {
    expect(unwrapRuleResult({ allow: false, reason: 'nope' })).toStrictEqual({
      allowed: false,
      reasons: ['nope'],
    })
    expect(unwrapRuleResult({ allow: true, reason: 'ok' })).toStrictEqual({
      allowed: true,
      reasons: [],
    })
  })
})
