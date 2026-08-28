import { describe, expect, it, vi } from 'vitest'

import { createPermix } from './permix'
import type { NuxtEvent } from './permix'

let currentEvent: NuxtEvent | undefined
let shouldThrow = false

vi.mock('h3', () => ({
  getRequestEvent: undefined,
  useEvent: () => {
    if (shouldThrow) {
      throw new Error('no event')
    }
    return currentEvent
  },
}))

describe('nuxt createPermix h3 useEvent fallback', () => {
  it('reads the event from useEvent when getRequestEvent is absent', () => {
    currentEvent = { context: {} }
    shouldThrow = false
    const permix = createPermix<{ post: ['create'] }>()
    permix.setup({ post: { create: true } })
    expect(permix.check('post.create')).toBe(true)
    currentEvent = undefined
  })

  it('treats a throwing useEvent as missing', () => {
    shouldThrow = true
    currentEvent = { context: {} }
    const permix = createPermix<{ post: ['create'] }>()
    expect(() => {
      permix.setup({ post: { create: true } })
    }).toThrow(/No request event found/)
    shouldThrow = false
    currentEvent = undefined
  })
})
