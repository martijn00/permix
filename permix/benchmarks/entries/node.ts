import { createPermix } from 'permix/node'

export const permissions = createPermix<{ post: ['read'] }>()
export const middleware = permissions.setupMiddleware({
  post: { read: true },
})
