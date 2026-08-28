import { createPermix } from 'permix/next'

export const permissions = createPermix<{ post: ['read'] }>(() => ({
  post: { read: true },
}))
