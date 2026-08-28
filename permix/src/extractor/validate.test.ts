import { describe, expect, it } from 'vitest'

import { validatePermissionCoverage } from './validate'

describe(validatePermissionCoverage, () => {
  it('reports unknown provider keys and uncovered catalog keys', () => {
    const result = validatePermissionCoverage(
      ['projects.read', 'projects.update'],
      new Set(['projects.read', 'projects.delete'])
    )

    expect(result).toStrictEqual({
      valid: false,
      unknown: ['projects.delete'],
      uncovered: ['projects.update'],
    })
  })

  it('accepts versioned catalogs as key sources', () => {
    const catalog = {
      schemaVersion: 1,
      permissions: [
        {
          key: 'projects.read',
          references: [],
        },
      ],
    } as const

    expect(
      validatePermissionCoverage(catalog, ['projects.read'])
    ).toStrictEqual({
      valid: true,
      unknown: [],
      uncovered: [],
    })
  })
})
