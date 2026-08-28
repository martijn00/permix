import { createTemplate } from 'permix'
import type { Rules, ValidateDefinition } from 'permix'

import type { Session } from './auth'

export interface Post {
  id: string
  authorId: string
}

export type PermissionsDefinition = ValidateDefinition<{
  post: [
    { name: 'create'; type: Post },
    { name: 'read'; type: Post },
    { name: 'update'; type: Post },
    { name: 'delete'; type: Post },
  ]
}>

export const adminTemplate = createTemplate<PermissionsDefinition>({
  post: { create: true, read: true, update: true, delete: true },
})

export const guestTemplate = createTemplate<PermissionsDefinition>({
  post: { create: false, read: true, update: false, delete: false },
})

export const publicReadTemplate = createTemplate<PermissionsDefinition>({
  post: { create: false, read: true, update: false, delete: false },
})

export function rulesForSession(
  session: Session | null
): Rules<PermissionsDefinition> {
  if (!session) {
    return guestTemplate()
  }

  if (session.role === 'admin') {
    return adminTemplate()
  }

  return {
    post: {
      create: true,
      read: true,
      update: (post) => post?.authorId === session.userId,
      delete: false,
    },
  }
}
