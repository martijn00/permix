import { createConvexPermix } from 'permix/convex'

export const permissions = createConvexPermix({
  resolveRules: () => ({ post: { read: true } }),
})
