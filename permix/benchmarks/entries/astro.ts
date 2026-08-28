import { createPermix } from 'permix/astro'

export const permissions = createPermix<{ post: ['read'] }>()
export const middleware = permissions.setupMiddleware({
  post: { read: true },
})
