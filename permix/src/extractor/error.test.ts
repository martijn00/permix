import { describe, expect, it } from 'vitest'

import { PermissionExtractionError } from './error'

describe(PermissionExtractionError, () => {
  it('uses the single diagnostic message', () => {
    const error = new PermissionExtractionError([
      {
        code: 'invalid-marker',
        file: 'src/a.ts',
        message: 'permission() requires exactly one static argument.',
      },
    ])

    expect(error.name).toBe('PermissionExtractionError')
    expect(error.message).toBe(
      'permission() requires exactly one static argument.'
    )
    expect(error.diagnostics).toHaveLength(1)
  })

  it('summarizes multiple diagnostics', () => {
    const error = new PermissionExtractionError([
      {
        code: 'dynamic-value',
        file: 'src/a.ts',
        message: 'first',
      },
      {
        code: 'invalid-marker',
        file: 'src/b.ts',
        message: 'second',
      },
    ])

    expect(error.message).toBe('Permission extraction failed with 2 errors.')
  })
})
