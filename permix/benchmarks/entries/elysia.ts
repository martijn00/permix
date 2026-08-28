import { createPermix } from 'permix/elysia'

export const permissions = createPermix<{ post: ['read'] }>()
export const plugin = permissions.setupMiddleware({ post: { read: true } })
