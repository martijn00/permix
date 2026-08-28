import { createConvexPermix } from 'permix/convex'

export const permissions = createConvexPermix<{ post: ['read'] }, never>({
  resolveRules: () => ({ post: { read: true } }),
})
