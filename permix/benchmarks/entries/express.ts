import { createPermix } from 'permix/express'

export const permissions = createPermix<{ post: ['read'] }>()
export const middleware = permissions.setupMiddleware({
  post: { read: true },
})
