import { createPermix } from 'permix/trpc'

export const permissions = createPermix<{ post: ['read'] }>()
export const context = permissions.setupContext({ post: { read: true } })
