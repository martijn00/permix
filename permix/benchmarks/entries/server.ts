import { createPermix } from 'permix/server'

export const permissions = createPermix<{ post: ['read'] }>()
export const middleware = permissions.setupMiddleware({
  post: { read: true },
})
