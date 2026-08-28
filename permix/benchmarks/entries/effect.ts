import { createPermix } from 'permix/effect'

export const permissions = createPermix<{ post: ['read'] }>({
  id: 'bundle-size',
})
export const layer = permissions.layer({ post: { read: true } })
