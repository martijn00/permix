import { describe, expect, it } from 'vitest'

import { createRules, dehydrateRules, hydrateRules } from './rules'

const nested = {
  post: { create: true, read: false },
  comment: { delete: () => true },
}

describe(dehydrateRules, () => {
  it('collapses nested booleans and function leaves', () => {
    expect(dehydrateRules(nested)).toStrictEqual({
      post: { create: true, read: false },
      comment: { delete: true },
    })
  })

  it('treats throwing function leaves as false', () => {
    expect(
      dehydrateRules({
        post: {
          read: () => {
            throw new Error('needs entity')
          },
        },
      })
    ).toStrictEqual({ post: { read: false } })
  })

  it('passes through non-object leaves', () => {
    expect(dehydrateRules(true)).toBe(true)
    expect(dehydrateRules(null)).toBeNull()
    expect(dehydrateRules(1)).toBe(1)
  })
})

describe(hydrateRules, () => {
  it('restores nested boolean trees', () => {
    const state = {
      post: { create: true, read: false },
      comment: { delete: true },
    }

    expect(hydrateRules(state)).toStrictEqual(state)
  })
})

describe(createRules, () => {
  it('returns the input rules unchanged', () => {
    const rules = {
      post: { create: true, read: false },
    }

    expect(createRules<{ post: ['create', 'read'] }>(rules)).toBe(rules)
  })
})
