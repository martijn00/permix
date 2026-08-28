import { createPermix } from 'permix/tanstack-start'

export const permissions = createPermix<{ post: ['read'] }>()
export const middleware = permissions.setupMiddleware({
  post: { read: true },
})
