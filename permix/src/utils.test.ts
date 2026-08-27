import { describe, expect, it } from 'vitest'

import { omit, pick } from './utils'

describe('utils', () => {
  describe('pick', () => {
    it('should pick specified keys from an object', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = pick(obj, ['a', 'c'])

      expect(result).toEqual({ a: 1, c: 3 })
      expect(result).not.toHaveProperty('b')
    })

    it('should return empty object when no keys are provided', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = pick(obj, [])

      expect(result).toEqual({})
    })

    it('should handle nested objects', () => {
      const obj = { a: 1, b: { x: 10, y: 20 }, c: 3 }
      const result = pick(obj, ['a', 'b'])

      expect(result).toEqual({ a: 1, b: { x: 10, y: 20 } })
    })
  })

  describe('omit', () => {
    it('should omit specified keys from an object', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = omit(obj, ['a', 'c'])

      expect(result).toEqual({ b: 2 })
      expect(result).not.toHaveProperty('a')
      expect(result).not.toHaveProperty('c')
    })

    it('should return the original object when no keys are provided', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = omit(obj, [])

      expect(result).toEqual(obj)
    })

    it('should handle nested objects', () => {
      const obj = { a: 1, b: { x: 10, y: 20 }, c: 3 }
      const result = omit(obj, ['a', 'c'])

      expect(result).toEqual({ b: { x: 10, y: 20 } })
    })
  })
})
