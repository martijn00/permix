import { createPermix } from 'permix/standard-schema'

export const permissions = createPermix({
  post: ['read'] as const,
})
permissions.setup({ post: { read: true } })
