import { describe, expect, expectTypeOf, it } from 'vitest'

import { createPermissionConfig, permission } from './permission'

describe(permission, () => {
  it('returns string keys unchanged and preserves their literal type', () => {
    const key = permission('tasks.comment')

    expect(key).toBe('tasks.comment')
    expectTypeOf(key).toEqualTypeOf<'tasks.comment'>()
  })

  it('returns object keys unchanged and accepts JSON-safe metadata', () => {
    const key = permission({
      key: 'billing.refund',
      title: 'Refund a payment',
      description: 'Allows an operator to refund a settled payment.',
      tags: ['billing', 'elevated'],
      annotations: {
        area: 'payments',
        elevated: true,
        surfaces: ['admin', 'api'],
        risk: 3,
        owner: null,
      },
    })

    expect(key).toBe('billing.refund')
    expectTypeOf(key).toEqualTypeOf<'billing.refund'>()
  })
})

describe(createPermissionConfig, () => {
  it('preserves metadata and limits keys to extracted permissions', () => {
    const definePermissionConfig = createPermissionConfig<
      'projects.read' | 'projects.update'
    >()
    const config = definePermissionConfig({
      'projects.read': {
        title: 'Read projects',
      },
    })

    expect(config['projects.read'].title).toBe('Read projects')
    expectTypeOf(config).toEqualTypeOf<{
      readonly 'projects.read': {
        readonly title: 'Read projects'
      }
    }>()

    function invalidConfigExample() {
      definePermissionConfig({
        // @ts-expect-error Unknown permissions cannot be centrally enriched.
        'projects.delete': {
          title: 'Delete projects',
        },
      })
    }

    expectTypeOf(invalidConfigExample).toBeFunction()
  })
})
