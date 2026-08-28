import { createClerkPermix } from 'permix/clerk'

export const permissions = createClerkPermix<{ post: ['read'] }>({
  resolveRules: () => ({ post: { read: true } }),
})
