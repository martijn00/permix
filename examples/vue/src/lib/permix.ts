import { createPermix } from 'permix/vue'

import type { Post } from '../composables/posts'
import type { User } from '../composables/user'

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
