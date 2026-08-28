import { createNextClerkPermix } from 'permix/clerk/next'

export const permissions = createNextClerkPermix<{ post: ['read'] }>({
  resolveRules: () => ({ post: { read: true } }),
})
