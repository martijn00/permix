import { createClerkPermix } from 'permix/clerk'

export const permissions = createClerkPermix<{ post: ['read'] }>({
  authenticateRequest: async () => null,
  resolveRules: () => ({ post: { read: true } }),
})
