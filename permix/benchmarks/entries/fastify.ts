import { createPermix } from 'permix/fastify'

export const permissions = createPermix<{ post: ['read'] }>()
export const plugin = permissions.setupMiddleware({ post: { read: true } })
