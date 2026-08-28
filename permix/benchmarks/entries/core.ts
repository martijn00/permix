import { createPermix } from 'permix'

export const permissions = createPermix<{ post: ['read'] }>({
  post: { read: true },
})
export const canRead = permissions.check('post.read')
