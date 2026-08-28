import { createPermix } from 'permix/orpc'

export const permissions = createPermix<{ post: ['read'] }>()
export const context = permissions.setupContext({ post: { read: true } })
