import { describe, expect, it } from 'vitest'

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
