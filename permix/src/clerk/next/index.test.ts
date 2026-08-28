import { auth } from '@clerk/nextjs/server'
import { describe, expect, it, vi } from 'vitest'

import { createClerkPermix } from '../server'
import { createNextClerkPermix } from './index'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_1' })),
}))

vi.mock('../server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../server')>()
  return {
    ...actual,
    createClerkPermix: vi.fn(actual.createClerkPermix),
  }
})

describe(createNextClerkPermix, () => {
  it('forwards Clerk auth() as authenticateRequest', async () => {
    createNextClerkPermix<{ post: ['read'] }>({
      resolveRules: () => ({ post: { read: true } }),
    })

    expect(createClerkPermix).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticateRequest: expect.any(Function),
      })
    )

    const options = vi.mocked(createClerkPermix).mock.calls[0]?.[0]
    await options?.authenticateRequest?.(new Request('https://example.com'))
    expect(auth).toHaveBeenCalledWith()
  })
})
