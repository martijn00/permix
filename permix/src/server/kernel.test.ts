import { describe, expect, it } from 'vitest'

import { createPermix as createCore } from '../core'
import { createRequestKernel, propertyBagStore, withContextKey } from './kernel'

describe(createRequestKernel, () => {
  it('attaches a ready instance and isolates context keys', () => {
    const store = new Map<
      string | symbol,
      ReturnType<typeof createCore<{ post: ['read'] }>>
    >()

    const kernel = withContextKey((resolveKey) =>
      createRequestKernel<{ post: ['read'] }, object>(resolveKey, {
        get: () => store.get(resolveKey()),
        set: (_container, instance) => {
          store.set(resolveKey(), instance)
        },
      })
    )

    const container = {}
    kernel.attach(container, { post: { read: true } })

    expect(kernel.getOrThrow(container).check('post.read')).toBe(true)
    expect(kernel.getRules(container)?.post.read).toBe(true)

    kernel.contextKey('other')
    expect(kernel.get(container)).toBeNull()
  })

  it('stores the instance on a property bag', () => {
    const kernel = withContextKey((resolveKey) =>
      createRequestKernel<{ post: ['read'] }, object>(
        resolveKey,
        propertyBagStore(resolveKey)
      )
    )

    const container = {}
    kernel.attach(container, { post: { read: true } })
    expect(kernel.getOrThrow(container).check('post.read')).toBe(true)
  })
})
