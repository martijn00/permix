import { describe, expect, it } from 'vitest'

import { omit, pick } from './utils'

describe('utils', () => {
  describe(pick, () => {
    it('should pick specified keys from an object', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = pick(obj, ['a', 'c'])

      expect(result).toStrictEqual({ a: 1, c: 3 })
      expect(result).not.toHaveProperty('b')
    })

    it('should return empty object when no keys are provided', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = pick(obj, [])

      expect(result).toStrictEqual({})
    })

    it('should handle nested objects', () => {
      const obj = { a: 1, b: { x: 10, y: 20 }, c: 3 }
      const result = pick(obj, ['a', 'b'])

      expect(result).toStrictEqual({ a: 1, b: { x: 10, y: 20 } })
    })
  })

  describe(omit, () => {
    it('should omit specified keys from an object', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = omit(obj, ['a', 'c'])

      expect(result).toStrictEqual({ b: 2 })
      expect(result).not.toHaveProperty('a')
      expect(result).not.toHaveProperty('c')
    })

    it('should return the original object when no keys are provided', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = omit(obj, [])

      expect(result).toStrictEqual(obj)
    })

    it('should handle nested objects', () => {
      const obj = { a: 1, b: { x: 10, y: 20 }, c: 3 }
      const result = omit(obj, ['a', 'c'])

      expect(result).toStrictEqual({ b: { x: 10, y: 20 } })
    })
  })
})
