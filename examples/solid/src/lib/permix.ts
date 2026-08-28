import { createPermix } from 'permix/solid'

import type { Post } from '../hooks/posts'
import type { User } from '../hooks/user'

export const { permix, PermixProvider, usePermix, Check } = createPermix<{
  post: ['read', { name: 'edit'; type: Post }]
}>()

export function setupPermix(user: User) {
  permix.setup({
    post: {
      read: true,
      edit: (post) => post?.authorId === user.id,
    },
  })
}
