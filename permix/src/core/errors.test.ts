import { describe, expect, it } from 'vitest'

import {
  PermixError,
  PermixForbiddenError,
  PermixNotFoundError,
  PermixNotReadyError,
  PermixRuleNotDefinedError,
} from './errors'

describe('core errors', () => {
  it('prefixes messages and preserves the PermixError name', () => {
    const error = new PermixError('boom')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('PermixError')
    expect(error.message).toBe('[Permix]: boom')
  })

  it('exposes PermixNotReadyError', () => {
    const error = new PermixNotReadyError()
    expect(error.name).toBe('PermixNotReadyError')
    expect(error.message).toContain('setup()')
  })

  it('stores the missing rule path', () => {
    const error = new PermixRuleNotDefinedError('post.delete')
    expect(error.name).toBe('PermixRuleNotDefinedError')
    expect(error.path).toBe('post.delete')
    expect(error.message).toContain('post.delete')
  })

  it('omits key when PermixNotFoundError is constructed without one', () => {
    const error = new PermixNotFoundError()
    expect(error.name).toBe('PermixNotFoundError')
    expect(error.key).toBeUndefined()
  })

  it('stores an optional lookup key', () => {
    const error = new PermixNotFoundError('instance')
    expect(error.key).toBe('instance')
  })

  it('exposes PermixForbiddenError', () => {
    const error = new PermixForbiddenError()
    expect(error.name).toBe('PermixForbiddenError')
    expect(error.message).toContain('Forbidden')
  })
})
